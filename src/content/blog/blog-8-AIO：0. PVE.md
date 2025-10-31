---
title: AIO：0. PVE
excerpt: 本系列为我的 J4125 搭建 ALL-IN-BOOM 的摸索笔记。
publishDate: 2023-07-26 14:10:00
tags:
  - 软路由
isFeatured: true
---

本系列为我的 J4125 搭建 ALL IN BOOM 的摸索笔记。

自用备份，不是什么详尽的教程。


## 更换企业源
付费订阅才能使用企业源，否则需要更换非订阅源才能正常更新 PVE。

```
PVE -> 更新 -> 存储库
禁用 https://enterprise.proxmox.com/debian/pve
添加 No-Subscription
```


## 关闭 KSM
在内存冗余的情况下，关闭 KSM （内存去重）以节省 CPU 开销。

```
systemctl disable ksmtuned
systemctl stop ksmtuned
```


## 删除 local-lvm 并把空间合并至 local
PVE 系统盘是傲腾，所以磁盘性能根本不在考虑范围，为了方便管理索性直接合二为一。

```
数据中心 -> 存储 -> local-lvm：删除；
数据中心 -> 存储 -> local -> 编辑 -> 内容：勾选所有内容；
```

```
lvremove /dev/pve/data
lvextend -rl +100%FREE /dev/pve/root
```


## 开启 PCI 直通

### 对于使用 GRUB 引导的系统（安装磁盘格式使用 ext4）
* 修改 grub

```
vi /etc/default/grub
```

```
GRUB_CMDLINE_LINUX_DEFAULT="quiet intel_iommu=on"
GRUB_CMDLINE_LINUX="intel_iommu=on"
```

* 添加内核模块

```
vi /etc/modules
```

```
vfio
vfio_iommu_type1
vfio_pci
```

```
update-grub
update-initramfs -u -k all
```

* 重启

### 对于使用```systemd-boot```引导的系统（安装磁盘格式使用 ZFS）
* 修改```kernel commandline```

```
vi /etc/kernel/cmdline
```

```
root=ZFS=rpool/ROOT/pve-1 boot=zfs intel_iommu=on​
```

```
/etc/kernel/postinst.d/zz-proxmox-boot
update-initramfs -u -k all
```

* 重启确认
```dmesg | grep -e DMAR -e IOMMU```



## 给垃圾 RTL 8125B 网卡更换官方驱动

默认的驱动是```r8169```，有断流情况。

建议使用[此仓库](https://github.com/devome/realtek-r8125-dkms)中的驱动，该驱动启用了TX多队列及RSS并禁用ASPM。

确保 PVE 的软件源没问题。

```
apt update && apt upgrade   # 更新 PVE
reboot   # 重启以进入最新内核
```

安装内核头

```
headers=$(dpkg -l | awk '/^ii.+kernel-[0-9]+\.[0-9]+\.[0-9]/{gsub(/-signed/, ""); gsub(/kernel/, "headers"); print $2}' | tr "\n" " ")
eval apt install -y $headers
```

之后把仓库中的软件包安装上去，安装过程略。

可通过```ethtool -i enp3s0```查看当前驱动，其中```enp3s0```为网口。

应该还是```r8169```，这样的话还需要屏蔽```r8169```，更新引导。

```
echo 'blacklist r8169' >> /etc/modprobe.d/blacklist-r8169.conf
update-grub   # 非 GRUB 启动参考上面操作即可
update-initramfs -u -k all
reboot
```

重启后可再次通过```ethtool -i enp3s0```确认驱动；

及通过```cat /proc/interrupts | grep -P 'enp3s0|CPU0'```查看中断数。

此时可在虚拟机的```VirtIO```网卡中设置```Multiqueue```了。

在虚拟机中可使用```ethtool -l eth0```来验证开启网卡多队列。


## 创建虚拟机
全虚拟化是很吃性能的，尽量使用 Virtio（半虚拟化）。

Windows 需要安装驱动，[下载地址](https://www.linux-kvm.org/page/WindowsGuestDrivers)。

```
各 SCSI 控制器：VirtIO SCSI single
系统 -> 机型：q35
磁盘 -> 格式：raw，缓存：Write back（不安全）
CPU -> 类别：host / Host，启用NUMA
```

对于磁盘格式，```raw```固然是性能最好的，但```qcow2```也不错，性能不比```raw```差多少，而且支持快照等功能。

对于磁盘缓存，```Write through```优化了读取性能，```Write back```优化了读写两者。

建议：Windows/OS X 使用```raw```+```Write back```；Linux等系统使用```qcow2```+```Write through```。


## 给虚拟机开启 virtio-gl
virtio-gl，通常称为 VirGL，是一种用于虚拟机内部的虚拟 3D GPU，可以将工作负载卸载到主机 GPU，而无需特定的驱动程序，也不会完全绑定主机 GPU，从而允许在多个客户机和或主机之间重用。

需要给 PVE 宿主机安装额外的软件包。

```
apt install libgl1 libegl1
```

然后在虚拟机的```硬件 -> 显示```选择```VirGL GPU```。


## 允许外部 VNC 访问虚拟机画面
允许外部的 VNC Viewer 远程连接 VM ID 为 100 的虚拟机，IP 为 PVE 物理机所在 IP，端口为5901。

```
qm set 101 -args "-vnc :1"
```


## RDM 裸磁盘映射
不能直通控制器的情况下使用 RDM 裸磁盘映射，缺点是虚拟机内查看不了硬盘的 smart 信息。

查看需要映射的磁盘的 ID。

```
ls -la /dev/disk/by-id/|grep -v dm|grep -v lvm|grep -v part
```

输出例如：

```
drwxr-xr-x 2 root root 300 Aug 10 23:03 .
drwxr-xr-x 7 root root 140 Aug 10 23:03 ..
lrwxrwxrwx 1 root root  13 Aug 10 23:02 nvme-eui.5cd2e4bf63af0100 -> ../../nvme0n1
lrwxrwxrwx 1 root root  13 Aug 10 23:02 nvme-INTEL_SSDPEK1A118GA_BTOC14120WMP118B -> ../../nvme0n1
```

修改此命令：

```
qm set <vmid> --scsiX /dev/disk/by-id/xxxxxxx
```

例如：

```
qm set <vmid> --scsi2 /dev/disk/by-id/nvme-eui.5cd2e4bf63af0100
```


## 备份/还原虚拟机
直接在对应虚拟机的备份页面中进行备份，备份文件在```/var/lib/vz/dump/```，还原时在此处导入文件即可。


## 参考
[Proxmox VEで無償版リポジトリを設定する ](https://blog.nishi.network/2023/02/12/proxmox7-3-repository/)  
[ProxmoxVE 合并local和local-lvm分区](https://www.xg2.top/archives/8530.html)  
[在 Proxmox 上進行 PCI-E 直通](https://www.zenwen.tw/pci-passthrough-with-proxmox/)
[PVE开启硬件直通功能](https://www.xh86.me/?p=11309)  
[Enabling IOMMU on PVE6 (zfs) compared to PVE5.4 (ext4)?](https://forum.proxmox.com/threads/enabling-iommu-on-pve6-zfs-compared-to-pve5-4-ext4.56111/)  
[PVE 8 安装 ReakTEK RTL8125B 2.5G网卡驱动](https://evine.win/p/pve-install-realtek-8125-driver/)  
[Proxmox VE开启网卡多队列](https://foxi.buduanwang.vip/virtualization/2125.html/)  
[Display](https://pve.proxmox.com/pve-docs/chapter-qm.html#qm_display)  
[Proxmox VE与VNC](https://foxi.buduanwang.vip/virtualization/pve/1823.html/)  
[Proxmox VE pve硬盘直通](https://foxi.buduanwang.vip/virtualization/1754.html/)  