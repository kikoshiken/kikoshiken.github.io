---
title: AIO：1. TrueNAS CORE
excerpt: 网络；性能优化；Jails；BT。
publishDate: 2023-07-26 14:11:00
tags:
  - 软路由
isFeatured: true
---

## 开启 RTL 8125B 网卡支持
最新版已经内置了 RTL 2.5G 网卡的驱动，但存在些许问题，没有默认开启。

修改以下文件；添加：

```
vi /boot/loader.conf
```

```
# RTL 8125B
if_re_load="YES"
if_re_name="/boot/modules/if_re.ko"
```


## 设置内存仅缓存元数据
高贵的全闪阵列就算是裸跑也能跑满2.5G网卡（

```
zfs set primarycache=metadata pool
```


## 监狱 pkg 更换中科大源
适合中国的网络环境。

创建目录及文件；粘贴以下内容：

```
mkdir -p /usr/local/etc/pkg/repos
vi /usr/local/etc/pkg/repos/FreeBSD.conf
```

```
FreeBSD: {
  url: "pkg+http://mirrors.ustc.edu.cn/freebsd-pkg/${ABI}/quarterly",
}
```

```
pkg update -f
```


## 监狱 开启 SSH
修改以下文件；找到对应项目更改为：

```
vi /etc/ssh/sshd_config
```

```
port 22
PermitRootLogin yes
```

设置 root 用户密码；SSH 开机自启；启用 SSH。

```
passwd root
```

```
sysrc sshd_enable=yes
service sshd start
```


## 在 TrueNAS 命令行中对 jail 进行简单控制

```
iocage start qbee   # 启动名称为 qbee 的 jail
iocage stop qbee   # 停止 jail
iocage restart qbee   # 重启 jail
```

参见 [iocage](https://iocage.readthedocs.io/en/latest/basic-use.html) 的官方文档。


## 监狱 编译安装 qBittorrent-Enhanced-Edition

```
pkg install git pkgconf qt5-core qt5-network qt5-svg qt5-linguisttools qt5-buildtools qt5-qmake boost-all libtorrent-rasterbar qt5-sql openssl
```

```
git clone https://github.com/c0re100/qBittorrent-Enhanced-Edition
```

如果是通过 SCP 协议接收的文件，还需更改权限。

```
chmod -R +x qBittorrent-Enhanced-Edition
```

编辑源码添加一行，否则编译报错。

```
cd qBittorrent-Enhanced-Edition
vi ./src/src.pro
```

```
DEFINES += _GNU_SOURCE
```

![img1](/img/blog9-img1.webp)

编译及安装。

```
./configure --disable-gui --prefix=/usr
make -j4
make install
```

设置开机启动，并将相关配置文件保存到你喜欢的位置。

```
vi /etc/rc.local
```

```
/usr/bin/qbittorrent-nox --webui-port=8080 -d --profile=/root/qbconfig
```

## 如果你选择使用社区提供的官方 qBittorrent
qBittorrent 相关目录文件在这里。

```
/var/db/qbittorrent/conf/qBittorrent/
```
4.6.1及后续版本更改了默认 web 密码，可以修改此文件

```
vi /var/db/qbittorrent/conf/qBittorrent/config/qBittorrent.conf
```

```
[Preferences]
WebUI\Password_PBKDF2="@ByteArray(ARQ77eY1NUZaQsuDHbIMCA==:0WMRkYTUWVT9wVvdDtHAjU9b3b7uB8NR1Gur2hmQCvCDpm39Q+PsJRJPaCU51dEiz+dTzh8qbPsL8WkFljQYFQ==)"
```

修改后会将 web 账户密码改回```admin```和```adminadmin```，在登入之后再进行修改。


## 部分参考
[FreeBSD pkg 源使用帮助](https://mirrors.ustc.edu.cn/help/freebsd-pkg.html)  
[iocage 1.2 documentation](https://iocage.readthedocs.io/en/latest/basic-use.html)  
[Compilation: FreeBSD (no GUI)](https://github.com/qbittorrent/qBittorrent/wiki/Compilation:-FreeBSD-(no-GUI))  
[Plugin qBittorrent path.](https://www.truenas.com/community/threads/plugin-qbittorrent-path.110035/)  
[PSA: If you can't login to qBittorrent (pass: adminadmin) check the container log .](https://www.reddit.com/r/unRAID/comments/180ou0b/psa_if_you_cant_login_to_qbittorrent_pass/)  