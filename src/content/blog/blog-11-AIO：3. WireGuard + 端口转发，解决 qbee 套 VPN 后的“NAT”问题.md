---
title: AIO：3. WireGuard + 端口转发，解决 qbee 套 VPN 后的“NAT”问题
excerpt: VPN 也要全锥形。
publishDate: 2023-12-27 19:31:00
tags:
  - 软路由
isFeatured: true
---

BuyVM 卢森堡的服务器，著名 DMCA Free，拿去跑 BT 再合适不过。

不过服务器孱弱的性能与硬盘肯定是不能直接跑 BT 的，要么是服务器上跑客户端然后挂载家里的NAS，要么是家里 NAS 跑客户端，用 VPN 连接服务器。个人选择了后者。

但还有个问题，VPN 相当于套了一层 NAT，主动连接别人没问题，但是反过来，别人主动连接的话就只能到达服务器，不能穿过 VPN 到达 NAS，这个问题得解决。

对付 NAT 那肯定是端口转发，所以 VPN 选择 WireGuard，建立一个内网，这样有内网 IP 之后就好转发了。


## 服务端配置 WireGuard
WireGuard 其实并不区分服务端和客户端，这里只是为了区分两台机器。

强烈建议阅读[这篇文章](https://www.procustodibus.com/blog/2020/11/wireguard-point-to-site-config/#configure-routing-on-host-b)。

服务器是 Arch，默认以 root 用户运行。

```
pacman -Sy wireguard-tools
(umask 0077; wg genkey > private)   # 创建服务器端私钥
```

```
vi /etc/wireguard/wg0.conf
```

```
[Interface]
Address = 10.0.1.1/24
Address = fd00::1/128
SaveConfig = true
ListenPort = 1123
PrivateKey = （刚刚创建的服务端私钥）

# 启用内核转发
PreUp = sysctl -w net.ipv4.ip_forward=1
PreUp = sysctl -w net.ipv6.conf.all.forwarding=1

# 防火墙允许转发
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE; ip6tables -A FORWARD -i wg0 -j ACCEPT; ip6tables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE; ip6tables -D FORWARD -i wg0 -j ACCEPT; ip6tables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
```

1123 是本机的 WireGuard 端口，选个喜欢的就好了。

```
wg-quick up wg0   # 启动接口
wg   # 查看状态与公钥
systemctl enable wg-quick@wg0   # 设置开机启动
```


## 客户端配置 WireGuard
客户端也是 ArchLinux。

为什么不用 Debian？因为垃圾螃蟹 8125B 在 Debian 系上跑不起来，还得是 Arch 系的内核版本够高（

```
pacman -Sy wireguard-tools
(umask 0077; wg genkey > private)   # 创建客户端私钥
```

```
vi /etc/wireguard/wg0.conf
```

```
[Interface]
Address = 10.0.1.2/24
Address = fd00::2/128
SaveConfig = true
ListenPort = 1123
PrivateKey = (刚刚创建的客户端私钥)

# IP forwarding   # 开启 IP 转发
PreUp = sysctl -w net.ipv4.ip_forward=1
PreUp = sysctl -w net.ipv6.conf.all.forwarding=1

[Peer]
PublicKey = （服务端公钥）
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = （服务器 IP）:1123
PersistentKeepalive = 25
```

如果客户端没有公网 IP，那么必须加上```PersistentKeepalive = 25```。

```
wg-quick up wg0
wg
systemctl enable wg-quick@wg0   # 设置开机启动
```

确认两端已经连上。


## 将 qBittorrent 的监听端口从服务器转发给客户端
我的监听端口是 11611。

```
# TCP IPv4
iptables -t nat -A PREROUTING -p tcp --dport 11611 -j DNAT --to-destination 10.0.0.2:11611   # 端口转发
iptables -t nat -A POSTROUTING -p tcp -s 10.0.0.2 --sport 11611 -j SNAT --to-source （你的服务器 IP）:11611   # 将 qbee 发出的流量改写成服务器的 IP

# TCP IPv6
ip6tables -t nat -A PREROUTING -p tcp --dport 11611 -j DNAT --to-destination [fd00::2]:11611
ip6tables -t nat -A POSTROUTING -p tcp -s fd00::2 --sport 11611 -j SNAT --to-source [你的服务器 IPv6]:11611   # 将转发给 qbee 的流量来源改写成服务器

# UDP IPv4
iptables -t nat -A PREROUTING -p udp --dport 11611 -j DNAT --to-destination 10.0.0.2:11611
iptables -t nat -A POSTROUTING -p udp -s 10.0.0.2 --sport 11611 -j SNAT --to-source （你的服务器IP）:11611

# UDP IPv6
ip6tables -t nat -A PREROUTING -p udp --dport 11611 -j DNAT --to-destination [fd00::2]:11611
ip6tables -t nat -A POSTROUTING -p udp -s fd00::2 --sport 11611 -j SNAT --to-source [你的服务器 IPv6]:11611
```

使命令在重启后也继续生效:

```
# Arch 系
# 执行以上规则后直接执行：
systemctl enable iptables --now
systemctl enable ip6tables --now
iptables-save > /etc/iptables/iptables.rules
ip6tables-save > /etc/iptables/ip6tables.rules
# 命令会保存到 /etc/iptables/iptables.rules 和 /etc/iptables/ip6tables.rules 里，
# 如果想删除，修改这两个文件或者直接删除就行了。
```

```
# Debian 系
# 执行以上规则，然后使用 iptables-persistent 软件包。
apt install iptables-persistent -y
netfilter-persistent  save
# 命令会保存到 /etc/iptables/rules.v4 和 /etc/iptables/rules.v6 里，
# 如果想删除，修改这两个文件或者直接删除就行了。
```

重启后可通过以下命令确认相关规则已生效。
```
iptables -L -t nat
ip6tables -L -t nat
```


## 虚拟机自动挂载 SMB，qbee 开机自启
种子客户端建议用 [qbee](https://github.com/c0re100/qBittorrent-Enhanced-Edition)，可以在高级设置里屏蔽吸血客户端。

有编译好的二进制，开箱即食。

为了安全性，请在 qbee 的高级设置里绑定接口为 wg0。

当然，想要开机自启的话还得自己写。

```
vi /usr/lib/systemd/system/qbee_boot.service
```

```
[Unit]
Description=qbee_boot
After=network-online.target nss-lookup.target
Wants=network-online.target nss-lookup.target

[Service]
Type=oneshot
ExecStart=mount -t cifs -o user=user,password=password //192.168.1.111/wd/media /nas/wd
ExecStart=systemctl start qbee
SysVStartPriority=99

[Install]
WantedBy=multi-user.target
```

```
vi /usr/lib/systemd/system/qbee.service
```

```
[Unit]
Description=qbee
After=network-online.target nss-lookup.target
Wants=network-online.target nss-lookup.target

[Service]
Type=oneshot
ExecStart=/root/qbittorrent-nox --webui-port=8080 -d --profile=/root/qbconfig
SysVStartPriority=99
RemainAfterExit=yes
```

我发现在 fstab 里直接写挂载，systemd 里写 qbee 的话，有可能在 qbee 启动之后硬盘还未被挂载导致报错。
所以就写成了这种扭曲的样子（

qbee_boot 启动了之后会自动启动 qbee，所以只需要设置前者开机自启就行了。

```
systemctl enable qbee_boot
```


## 参考
[WireGuard Point to Site Configuration WIREGUARD](https://www.procustodibus.com/blog/2020/11/wireguard-point-to-site-config/#configure-routing-on-host-b)  
[部署WireGuard VPN](https://cloud-atlas.readthedocs.io/zh-cn/latest/linux/security/vpn/wireguard/deploy_wireguard.html)  
[Linux 启用 IP 转发 (IPv4 / IPv6) | 内核转发](https://blog.acesheep.com/index.php/archives/973/)  
[利用WireGuard进行端口转发](https://blog.messyghost.net/?p=130)  
[iptables](https://wiki.archlinuxcn.org/wiki/Iptables)  
[Ubuntu下如何永久保存iptables规则](https://www.sourismu.me/archives/87/)  
[ip6tables IPV6 端口转发](https://hostloc.com/thread-1014496-1-1.html)  
[Linux 查看端口占用情况](https://www.runoob.com/w3cnote/linux-check-port-usage.html)  
[arch开机自启动脚本](https://zakariyya.github.io/2018/04/23/%E6%90%AD%E5%BB%BA-%E7%BF%BB%E5%A2%99-arch-%E5%BC%80%E6%9C%BA%E8%87%AA%E5%90%AF%E5%8A%A8%E8%84%9A%E6%9C%AC/)  
[systemd](https://wiki.archlinuxcn.org/wiki/Systemd)  
[Linux 程序开机启动并保活：Systemd 进程守护管理工具](https://www.yywr.net/547.yy)  


## 题外话
在 systemd 207 之前，开启 IP 转发是在```/etc/sysctl.conf```中修改或添加两行：
```
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding=1
```
而在 systemd 207 之后，文件变成了```/etc/sysctl.d/99-sysctl.conf```。

参见：  
[Linux 启用 IP 转发 (IPv4 / IPv6) | 内核转发](https://blog.acesheep.com/index.php/archives/973/)  
[sysctl](https://wiki.archlinuxcn.org/wiki/Sysctl)  


## 在 Jail 中运行 WireGuard 客户端
少一个虚拟机，访问文件也不需要走网络。
就是 FreeBSD 的学习成本有点高（

* 启用内核模块
在```系统 -> 微调```中添加并重启：
变量：```if_wg_load```
值：```YES```
类型：```loader```

* 安装 WireGuard
```
pkg install wireguard-tools
```

* 修改配置文件
```
vi /usr/local/etc/wireguard/wg0.conf
```
注意文件里不要包含```iptables```命令，FreeBSD 是不用这个的。

* 启用服务，开机运行
```
sysrc wireguard_interfaces="wg0"
sysrc wireguard_enable="YES"
```
或直接修改```/etc/rc.conf```。

* 运行
```
service wireguard start
```

## 参考
[Truenas 13.0 Wireguard in jail kernel mode wont work](https://www.truenas.com/community/threads/truenas-13-0-wireguard-in-jail-kernel-mode-wont-work.101195/)  
[How to install a Wireguard VPN client in a FreeBSD jail](https://www.cyberciti.biz/faq/how-to-install-a-wireguard-vpn-client-in-a-freebsd-jail/)  
[How-To: Setup a Wireguard VPN Server in a Jail](https://www.truenas.com/community/resources/how-to-setup-a-wireguard-vpn-server-in-a-jail.147/)  