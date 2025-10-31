---
title: AIO：5. 三星990EP，TrueNAS SCALE
excerpt: 丟掉 J4125，转战 N150！
publishDate: 2025-10-31 14:00:00
tags:
  - 软路由
isFeatured: true
---

## 解决 PVE 下直通三星990EP遇到的不读盘的问题
目前的 PVE 9.0.3 版本，不管是直通给 Windows 还是给 Linux，都是能看到 NVMe 控制器，但是看不到硬盘，原因不明。

解决方法来自 PVE 论坛，原理不明。

在 PVE 中列出所有 NVMe 硬盘，并记下 990EP 的 ID 是```144d:a80d```。
```
lspci -nn | grep -i nvme
```
```
3:00.0 Non-Volatile memory controller [0108]: Samsung Electronics Co Ltd NVMe SSD Controller PM9C1a (DRAM-less) [144d:a80d]
```

编辑 VFIO 配置文件并添加一行。
```
vi /etc/modprobe.d/vfio.conf
```
```
options vfio-pci ids=144d:a80d disable_idle_d3=1
```
```
update-initramfs -u
```

重启 PVE。


## 在 TrueNAS SCALE 的容器中设置 qbee 的开机自启
直接使用二进制，并且直接指定配置目录。
省事，转移起来还方便。

先手动运行一次修改好密码。
```
/root/qbittorrent-nox --webui-port=8080 --profile=/mnt/qb/config/qbee
```

```
/etc/systemd/system/qbee.service
```
```
[Unit]
Description=qBittorrent-nox Service
Wants=network-online.target
After=network-online.target
RequiresMountsFor=/mnt/qb/config/qbee

[Service]
User=root
Group=root
Type=simple
ExecStart=/root/qbittorrent-nox --webui-port=8080 --profile=/mnt/qb/config/qbee
Restart=on-failure

[Install]
WantedBy=multi-user.target
```
注意二进制文件和配置保存目录的路径。

```
systemctl daemon-reload
systemctl enable qbee.service
systemctl start qbee.service
systemctl status qbee.service
```


## 参考
[NVMe Passtrough not working trough M.2 adapter card](https://forum.proxmox.com/threads/nvme-passtrough-not-working-trough-m-2-adapter-card.163601/)