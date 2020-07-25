# auto-scroll

一款简单地自动滚动JavaScript插件。

## Feature
- [x] 滚动fps
- [x] 是否鼠标悬停
- [x] 支持滚动的过程发请求再次获取数据，可以设置触发请求的条件，默认为滚动1/4即发请求.同时支持滚轮滚动
- [x] 支持指定滚动多少距离后暂停
- [x] 支持指定滚动距离后暂停指定时间
- [x] 支持按照儿子高度自动滚动暂停

## Usage

**浏览器**

```html
<script src="./vendor/auto-scroll.js"></script>
<script>
    new AutoScroll(container, {
        // ...
    })
    // or
    new AutoScroll("#container", {
        // ...
    })
</script>
```

**Webpack**

```shell
npm i auto-scroll -S
```

```javascript
import AutoScroll from "AutoScroll";
// or
// const AutoScroll = require("AutoScroll")

new AutoScroll(container, {
    // ...
})
// or
new AutoScroll("#container", {
    // ...
})
```

see examples for more details.

## Options

| name              | description                                                  | type                                                         | default |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------- |
| fps               | 帧数                                                         | number                                                       | 60      |
| step              | 每帧行走多少距离（单位：px）                                 | number                                                       | 1       |
| hoverStop         | 鼠标悬浮停止滚动                                             | boolean                                                      | false   |
| wheel             | 滚轮滚动                                                     | boolean                                                      | false   |
| suspend           | 指定滚动距离后暂停指定时间                                   | boolean                                                      | false   |
| suspendStep       | 表示滚动多少距离后暂停（仅当suspendItem为false有效）         | number                                                       | 40      |
| suspendItem       | 表示滚动一个子项的高度暂停                                   | boolean                                                      | true    |
| suspendItemEqual  | 若子项高度均相等，可开启该属性减少查询dom提高性能            | boolean                                                      | false   |
| suspendTime       | 表示滚动暂停时间（单位：ms）                                 | number                                                       | 2000    |
| remote            | 自动发送请求不断获取远程数据。<br />用户需手动停止改状态.用于数据量大循环请求的场景 | boolean                                                      | false   |
| remoteMethod      | 请求数据方法                                                 | function(instance, finishRequest)<br />instance：当前实例<br />finishRequest：结束请求，一定要调用！ | null    |
| remoteCondition   | 发送请求的条件（默认：滚动轴过1/4，发送请求）                | function                                                     | null    |
| copyScrollContent | 自定义拷贝方法，显示返回false阻止默认拷贝dom行为             | function                                                     | null    |

## Api

| name         | description              | 参数 |
| ------------ | ------------------------ | ---- |
| getContainer | 获取容器dom              |      |
| stopScroll   | 暂停滚动                 |      |
| resumeScroll | 恢复滚动                 |      |
| isRemote     | 是否发送远程请求获取数据 |      |
| stopRemote   | 停止发送远程请求         |      |
| destroy      | 销毁事件                 |      |

