---
title: AIO：4. OpenWrt, Windows
excerpt: 软路由怎么能少得了路由和下载机？
publishDate: 2024-2-12 19:30:00
tags:
  - 软路由
isFeatured: true
---

## 编译 OpenWrt
* 安装依赖

```
yay -Sy openwrt-devel
```

* [Lean 的 LEDE 源码](https://github.com/coolsnowwolf/lede)预装组件太多了，如果想删除，需要修改源码目录里的以下文件。

```
include/target.mk
target/linux/*/{Makefile,subtarget/target.mk,image/Makefile,image/subtarget.mk}
```

我更推荐 [immortalwrt](https://github.com/immortalwrt/immortalwrt)。

* 选择测试内核

内核版本会更高。

```
Global build settings  --->
    *** General build options ***
    [*] Use the testing kernel version
```

* 添加 qemu guest agent

```
Utilities --->
    Virtualization --->
        <*> qemu-ga
```

* 不编译```block-mount```

某些版本的```block-mount```导致开机后硬盘进入只读模式，参见[此处](https://github.com/coolsnowwolf/lede/issues/10317)。

可通过修改上面的文件删除预装项或在```make menuconfig```中取消勾选。

```
Extra packages ---> automount
Base system ---> block-mount
```


## OpenWrt
创建 OpenWrt 虚拟机的方法和先前创建 Arch Linux 的时候差不多，唯一不同的地方在于，不需要提前分配硬盘。

然后上传编译好的 img 镜像。

```
qm importdisk 103 /var/lib/vz/template/iso/openwrt.img  local-zfs --format=qcow2
```

然后手动去对应的 WEB 界面里添加硬盘就可以了。


## Windows
宁愿24小时开着一个 Win10 虚拟机也不给度盘充一分钱。

顺便再跑个 AdGuard Home。当然你跑在 OpenWrt 上也没问题。

[Windows 版二进制官方下载地址](https://adguard.com/zh_cn/adguard-windows/overview.html)。

解压，CMD 进入二进制所在文件夹，执行命令安装服务。

```
.\AdGuardHome.exe --service install
```


## 参考
[重启后文件只读了，但是执行 mount -o remount rw / 可解决 #10317](https://github.com/coolsnowwolf/lede/issues/10317)  
[pve为vm导入已有的磁盘镜像/qcow2/vmdk](https://foxi.buduanwang.vip/virtualization/372.html/)  
[AdGuard Home 安装及使用指北](https://sspai.com/post/63088)  