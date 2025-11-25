---
title: AIO：0. PVE
excerpt: 本系列为我的 J4125 搭建 ALL-IN-BOOM 的摸索笔记。
publishDate: 2023-07-26 14:10:00
tags:
  - 软路由
isFeatured: true
---

本系列为我搭建 ALL-IN-BOOM 的摸索笔记。

自用备份，不是什么详尽的教程。


## 更换企业源
付费订阅才能使用企业源，否则需要更换非订阅源才能正常更新 PVE。

```
PVE -> 更新 -> 存储库
禁用 https://enterprise.proxmox.com/debian/pve
添加 No-Subscription
```


## 备份/还原虚拟机
直接在对应虚拟机的备份页面中进行备份，备份文件在```/var/lib/vz/dump/```，还原时在此处导入文件即可。


## 关闭 KSM
在内存冗余的情况下，关闭 KSM （内存去重）以节省 CPU 开销。

```
systemctl disable ksmtuned
systemctl stop ksmtuned
```


## 允许外部访问虚拟机画面
允许外部的 VNC Viewer 远程连接 VM ID 为 101 的虚拟机，IP 为 PVE 物理机所在 IP，端口为5901，__无密码__。
```
qm set 101 -args "-vnc :1"
```
允许外部的 SPICE 远程连接 VM ID 为 102 的虚拟机，IP 为 PVE 物理机所在 IP，端口为5902，__无密码__。
```
vi /etc/pve/qemu-server/102.conf
```
添加以下行，并将虚拟机的显示输出设置为 SPICE。
```
args: -spice port=5902,addr=0.0.0.0,disable-ticketing=on
```


## WEB 管理页面优化
可在管理页面方便地查看CPU和硬盘温度等数据，并关闭恼人的无订阅提醒。

[PVE-mods 项目地址。](https://github.com/Meliox/PVE-mods)
```
apt-get install lm-sensors
# lm-sensors must be configured, run below to configure your sensors, apply temperature offsets. Refer to lm-sensors manual for more information.
sensors-detect 
wget https://raw.githubusercontent.com/Meliox/PVE-mods/refs/heads/main/pve-mod-gui-sensors.sh
bash pve-mod-gui-sensors.sh install
# Then clear the browser cache to ensure all changes are visualized.
```
```
wget https://raw.githubusercontent.com/Meliox/PVE-mods/refs/heads/main/pve-mod-nag-screen.sh
bash pve-mod-nag-screen.sh install
```


## 不把内存给 ZFS
~~只要不炸就行，谁管你读写性能（~~
* 设置 ARC 能使用的内存为 64M
```
vi /etc/modprobe.d/zfs.conf
```
```
options zfs zfs_arc_min=67108864
options zfs zfs_arc_max=67108864
```
```
update-initramfs -u -k all
proxmox-boot-tool refresh
```
* 设置 ZFS 不要缓存任何东西
```
zfs set primarycache=none rpool
```
验证。
```
zfs get primarycache rpool
```
重启。


## 开启 PCI 直通
本文的步骤仅适合使用 systemd-boot 启动的 PVE。
```
vi /etc/kernel/cmdline
```
__在第一行的后面添加！不要加到第二行去！__
```
quiet intel_iommu=on
```
刷新 BL。
```
pve-efiboot-tool refresh
```


## SR-IOV 方式直通 GPU
[教程原文。](https://www.derekseaman.com/2024/07/proxmox-ve-8-2-windows-11-vgpu-vt-d-passthrough-with-intel-alder-lake.html)

这里我把主要的命令摘出来。

安装 Git、内核头文件并进行一些清理工作。
```
apt update && apt install git sysfsutils pve-headers mokutil -y
rm -rf /usr/src/i915-sriov-dkms-*
rm -rf /var/lib/dkms/i915-sriov-dkms
rm -rf ~/i915-sriov-dkms*
find /lib/modules -regex ".*/updates/dkms/i915.ko" -delete
```
克隆 DKMS 仓库并进行构建。
```
cd ~
git clone https://github.com/strongtz/i915-sriov-dkms.git
apt install build-* dkms
cd ~/i915-sriov-dkms
dkms add .
```
构建新内核并检查内核模块安装状态，验证它是否显示```installed```。
```
VERSION=$(dkms status -m i915-sriov-dkms | cut -d':' -f1)
dkms install -m $VERSION --force
dkms status
```
我没设置安全启动，直接跳到修改 systemd-boot 这步。
```
vi /etc/kernel/cmdline
```
__在第一行的后面添加！不要加到第二行去！__
```
iommu=pt i915.enable_guc=3 i915.max_vfs=7
```
由于在之前设置直通 PCI 的时候已经添加了```intel_iommu=on```，在这里就不重复添加了。
```
proxmox-boot-tool refresh
```
修改 PCIe 总线编号。大部分情况下，核显的编号都是```00:02.0```。
```
vi /etc/sysfs.conf
```
```
devices/pci0000:00/0000:00:02.0/sriov_numvfs = 7
```
重启并验证。
```
lspci | grep VGA
dmesg | grep i915
```
应该返回8行 PCIe 设备信息以及```Enabled 7 VFs```。


## 参考
[Proxmox VEで無償版リポジトリを設定する ](https://blog.nishi.network/2023/02/12/proxmox7-3-repository/)  
[在 Proxmox 上進行 PCI-E 直通](https://www.zenwen.tw/pci-passthrough-with-proxmox/)  
[Proxmox VE开启网卡多队列](https://foxi.buduanwang.vip/virtualization/2125.html/)  
[Display](https://pve.proxmox.com/pve-docs/chapter-qm.html#qm_display)  
[Proxmox VE与VNC](https://foxi.buduanwang.vip/virtualization/pve/1823.html/)  
[Meliox/PVE-mods: Proxmox modifications](https://github.com/Meliox/PVE-mods)  
[Proxmox VE 9.0: Windows 11 vGPU (VT-d) Passthrough with Intel Alder Lake](https://www.derekseaman.com/2024/07/proxmox-ve-8-2-windows-11-vgpu-vt-d-passthrough-with-intel-alder-lake.html)