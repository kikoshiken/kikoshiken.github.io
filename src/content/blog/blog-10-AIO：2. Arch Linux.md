---
title: AIO：2. Arch Linux
excerpt: 安装；ssh；串口；qemu ga；bbr；yay。
publishDate: 2023-12-27 19:30:00
tags:
  - 软路由
isFeatured: true
---

安装阶段可选```zen```内核，据说有蜜汁优化？（


## 在 BuyVM 的服务器上安装 Arch Linux
在执行```archinstall```之前，建议先执行：

```
pacman -Sy archlinux-keyring
```

预先安装好```vi```和```net-tools```，后续进入系统后是没网络的，需要配置静态 IP。

* 把网络接口名称改回传统命名，好看一点

```
ln -s /dev/null /etc/udev/rules.d/80-net-setup-link.rules
```

* 配置静态 IP

```
vi /etc/systemd/network/eth0.network
```

```
[Match]
Name=eth0

[Network]
Address=（你的 IPv4 地址）/24
Gateway=（你的 IPv4 地址网关）
Address=（你的 IPv6 地址）
Gateway=（你的 IPv6 地址网关）
DNS=8.8.8.8
```

地址和网关都能在控制面板里查看，其中 IPv6 地址还需在面板里手动添加，[教程](https://dausruddin.com/how-to-enable-ipv6-on-buyvm-vps-with-ubuntu-20-04/)。

```
systemctl enable systemd-networkd --now
systemctl enable systemd-resolved --now
```


## 允许 ssh 登录 root 用户

```
vi /etc/ssh/sshd_config
```

```
PermitRootLogin yes
```

接下来回到 PVE 中配置虚拟机中的 Arch Linux。


## 设置串口输出显示
串口输出仅供图一乐，建议还是使用默认的显示输出。

```
vi /etc/default/grub
```
修改```GRUB_CMDLINE_LINUX_DEFAULT="quiet```中的```quiet```

```
GRUB_CMDLINE_LINUX_DEFAULT="console=tty0 console=ttyS0,115200n8"
```

```
update-grub
```

如果提示```update-grub```不存在，可以手动创建

```
vi /usr/sbin/update-grub
```

```
#!/bin/sh
set -e
exec grub-mkconfig -o /boot/grub/grub.cfg "$@"
```

```
chown root:root /usr/sbin/update-grub
chmod 755 /usr/sbin/update-grub
```


## 安装 qemu guest agent
安装后可以在概览页面显示虚拟机的 IP 地址，也方便 PVE 在虚拟机内部执行指令。

```
pacman -Sy qemu-guest-agent
systemctl enable qemu-guest-agent --now
```


## 启用 Google TCP BBR v3
这两台 Arch，一台要跑 qbee，另一台要用 WireGuard 代理 qbee 的所有流量。

吞吐量都很大，开启 bbr 也许有正面效果（吧？

```
echo "net.core.default_qdisc=fq_codel" >> /etc/sysctl.d/bbr.conf
echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.d/bbr.conf
modprobe tcp_bbr
sysctl -p /etc/sysctl.d/bbr.conf
```

确认开启

```
sysctl net.ipv4.tcp_available_congestion_control
sysctl net.ipv4.tcp_congestion_control
```

确认 BBR 版本

```
modinfo tcp_bbr
```


## 修改开机时 GRUB 等待时间

```
vi /etc/default/grub
```

修改```GRUB_TIMEOUT```项目。

```
grub-mkconfig -o /boot/grub/grub.cfg
```



## 安装 Yay

```
sudo pacman -Sy git
sudo pacman -S git
cd ~
git clone https://aur.archlinux.org/yay.git
cd yay
makepkg -si
cd ~
rm -rf yay
```

## 参考
[buyvm安装archlinux](https://lala.im/7262.html)
[arch linux配置IP(静态或动态)](https://cloud-atlas.readthedocs.io/zh-cn/latest/linux/arch_linux/archlinux_config_ip.html)  
[How to enable IPv6 on BuyVM VPS with Ubuntu 20.04](https://dausruddin.com/how-to-enable-ipv6-on-buyvm-vps-with-ubuntu-20-04/)  
[Assigning IPv6 to Debian VPS ... How?](https://lowendtalk.com/discussion/169031/assigning-ipv6-to-debian-vps-how)  
[chmod 755 /usr/sbin/update-grub](https://askubuntu.com/questions/418666/update-grub-command-not-found)  
[PVE中 qemu guest agent的安装和使用](https://foxi.buduanwang.vip/virtualization/pve/530.html/)  
[Enabling BBR On Arch Linux 6.5.5+](https://gist.github.com/epyonavenger/a7d0bdcdb64169c4b0031391e10ff203)  
[BBR V3的安装和效果测试](https://www.hishd.top/archives/2024/279)  
[GRUB](https://wiki.archlinuxcn.org/zh-hans/GRUB)  
[Arch Linux Setup Guide for Laptops 安装指南（笔记本）.md](https://gist.github.com/howyay/d9db9c0549eae51fbe97deb382a42933)  
[初级：如何在 Arch Linux 中安装 Yay AUR 助手 ](https://linux.cn/article-14846-1.html)  