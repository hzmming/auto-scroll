/*!
 * AutoScroll.js v1.3.0
 * (c) 2019 LoryHuang
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            (global = global || self, global.AutoScroll = factory());
}(this, function () { 'use strict';

    function AutoScroll (dom, options) {
        if (!(this instanceof AutoScroll)) {
            return console.error('AutoScroll is a constructor and should be called with the `new` keyword');
        }
        this._init(dom, options)
    }

    function getPrototype (a) {
        return Object.prototype.toString.call(a).slice(8,-1)
    }

    AutoScroll.prototype._init = function (dom, options) {
        // 默认参数
        this.config = {
            fps: 60, // 帧率
            step: 1,  // 一次前进多少.单位：px
            remote: false, // 若设为true，表明开始滚动后数据会发生变化，用户需手动停止改状态.用于数据量大循环请求的场景
            remoteMethod: null,
            remoteCondition: null,
            hoverStop: false,
            copyScrollContent: null,
            wheel: false, // 支持滚轮滚动
            suspend: false,
            suspendItem: true, // 表示滚动一个儿子的高度暂停，默认为true
            suspendItemEqual: false, // 若儿子高度均相等，可开启该属性减少查询dom（应该能提高性能吧，俺也不知道诶）
            suspendTime: 2000, // 单位（ms）
            suspendStep: 40, // 表示滚动多少距离后暂停（仅当suspendItem为false有效）
        }

        // 初始化参数
        if(options instanceof Object){
            for (var key in options) {
                this.config.hasOwnProperty(key) && (this.config[key] = options[key])
            }
        }

        // 容器
        this.container = typeof dom === 'string' ? document.querySelector(dom) : dom
        if(!this.container){
            return console.error('dom节点不存在');
        }

        // 子元素列表（是元素element，不包括非element的text、comment节点[node]）
        this.children = this.container.children;

        // 隐藏滚动轴
        this.container.style.overflow = 'hidden'
        this.now = null;
        this.lastSuspendTime = this.last = Date.now()
        this.interval = 1000/this.config.fps
        this.delta = null;
        this.raf = null;
        this.stop = false;
        this.isRequesting = false;
        this.isSuspend = false;
        this.suspendScrollTop = 0;
        this.suspendItemIndex = 0;
        this.suspendItemHeight = this.children.item(0).offsetHeight;
        this._stopScroll = null     // mousenter事件用
        this._resumeScroll = null   // mousenter事件用
        this._doWheel = null          // mousewheel事件用

        // 判断是否要滚动
        var needScroll = this.container.scrollHeight > this.container.clientHeight
        if(needScroll){
            // 拷贝一份滚动内容，为了实现元素循环滚动的假象
            // 如果开启了'数据变化'，便不再复制数据，并且需自己保障每次滚动的数据足够多，不然滚动到底，在新的数据到来时会出现停顿
            !this.config.remote && this._copyScrollContent()
            // 开始滚动
            this._startScroll()
            // 悬浮停止
            this._initHoverEvent()
            // 支持滚轮滚动
            this._initWheelEvent()
        }
    }

    AutoScroll.prototype._initHoverEvent = function () {
        if(this.config.hoverStop){
            this._stopScroll = this.stopScroll.bind(this)
            this._resumeScroll = this.resumeScroll.bind(this)
            this.container.addEventListener('mouseenter', this._stopScroll)
            this.container.addEventListener('mouseleave', this._resumeScroll)
        }
    }

    AutoScroll.prototype._initWheelEvent = function () {
        if(this.config.wheel){
            this._doWheel = this.doWheel.bind(this)
            this.container.addEventListener('mousewheel', this._doWheel)
        }
    }

    AutoScroll.prototype._copyScrollContent = function () {
        var result = this.config.copyScrollContent && this.config.copyScrollContent()
        // return false表明不执行之后的复制动作
        if(getPrototype(result) === 'Boolean' && !result) return
        this.container.innerHTML = this.container.innerHTML + this.container.innerHTML
    }

    AutoScroll.prototype._startScroll = function () {
        this.raf = requestAnimationFrame(this._startScroll.bind(this))
        // 场景：悬浮停止
        if(this.stop){
            return;
        }

        // 更新时间
        this.now = Date.now()
        this.delta = this.now - this.last

        // 场景：暂停
        if(this.isSuspend){
            // 判断暂停时间是否结束
            if(this.now - this.lastSuspendTime < this.config.suspendTime){
                return;
            }
        }

        var scrollHeight = this.container.scrollHeight,
            scrollTop = this.container.scrollTop,
            clientHeight = this.container.clientHeight;

        var whetherToSuspend = false;
        // 判断是否到暂停距离
        if(this.config.suspendItem){
            whetherToSuspend = scrollTop - this.suspendScrollTop >= this.suspendItemHeight
        }else{
            whetherToSuspend = scrollTop - this.suspendScrollTop >= this.config.suspendStep
        }
        if(whetherToSuspend){
            // 输出的距离永远等于suspendStep
            // console.log('距离',scrollTop - this.suspendScrollTop)
            //
            // console.log(this.suspendItemIndex, this.suspendItemHeight, this.children.item(this.suspendItemIndex).innerHTML)
            this.suspendScrollTop = scrollTop
            this.isSuspend = true
            this.lastSuspendTime = this.now;
            this._updateSuspendItemInfo()
            return;
        }

        // 判断是否滚动到底
        var isEnd = scrollHeight - scrollTop === clientHeight
        if(isEnd){
            // 到底重置.注意，不是重置为0哦
            this._reset()
            // return cancelAnimationFrame(raf)
        }

        if(this.delta >= this.interval){
            // this.last = this.now
            this.last = this.now - (this.delta % this.interval)
            this._scroll()
            // remote相关操作
            this._doRemote()
        }
    }

    AutoScroll.prototype._updateSuspendItemInfo = function () {
        if(this.config.suspendItem){
            this.suspendItemIndex++;
            // 循环重置
            /**
             * 执行_copyScrollContent方法后，suspendItemIndex会大于实际儿子长度，但因为指向的元素是实际元素拷贝出来的，所以也无所谓
             * 如果想重置到真实的下标，也可以在执行_copyScrollContent方法后，suspendItemIndex -= this.children.length/2[真实儿子长度]
             */
            this.suspendItemIndex >= this.children.length && (this.suspendItemIndex = 0)
            // 开启suspendItemEqual表示儿子高度均等，只需以第一个儿子高度为准，无需重新获取
            this.config.suspendItemEqual || (this.suspendItemHeight = this.children.item(this.suspendItemIndex).offsetHeight)
        }
    }

    AutoScroll.prototype._doRemote = function () {
        // 执行远程请求，isRequesting保证上一次请求结束才能再发
        this.config.remote && !this.isRequesting && this._remoteMethod()
    }

    AutoScroll.prototype._remoteMethod = function () {
        // 判断是否需要发请求
        // 不知道会不会造成reflow啊...
        // 默认条件：若滚动轴过1/4，触发请求
        var isNeedRequest = this.config.remoteCondition ? this.config.remoteCondition() : (this.container.scrollTop >= this.container.scrollHeight/4)
        if(isNeedRequest){
            this.isRequesting = true
            this.config.remoteMethod(this, this._finishRequest.bind(this))
        }
    }

    AutoScroll.prototype._finishRequest = function () {
        this.isRequesting = false
    }

    AutoScroll.prototype._reset = function () {
        // console.log('reset')
        // 自从上次暂停结束后滚动的距离
        var walkDistance = this.container.scrollTop - this.suspendScrollTop
        if(this.config.remote){
            this.container.scrollTop = this.container.scrollHeight - this.container.clientHeight
        }else{
            this.container.scrollTop = this.container.scrollHeight/2 - this.container.clientHeight
        }
        // 因为无缝滚动，所以scrollTop变完后的距离减掉walkDistance就可以推出现在的suspendScrollTop
        this.suspendScrollTop = this.container.scrollTop - walkDistance
    }

    AutoScroll.prototype._scroll = function () {
        this.container.scrollTop += this.config.step
    }

    AutoScroll.prototype.getContainer = function () {
        return this.container
    }

    AutoScroll.prototype.stopScroll = function () {
        this.stop = true
    }

    AutoScroll.prototype.resumeScroll = function () {
        this.stop = false
    }

    AutoScroll.prototype.doWheel = function (evt) {
        // firefox 70.0.1，一次滚动的距离实际上是54，用的DOMMouseScroll测的
        // chrome 78.0.3904.87，一次滚动的距离实际上是53，用的是mousewheel
        // IE没测
        // onwheel还没测
        evt.currentTarget.scrollTop += evt.wheelDelta < 0 ? 53 : -53
        // remote相关操作
        this._doRemote()
    }

    AutoScroll.prototype.getRemote = function () {
        return this.config.remote
    }

    AutoScroll.prototype.toggleRemote = function () {
        this.config.remote = !this.config.remote
        this.config.remote || this._copyScrollContent()
    }

    AutoScroll.prototype.destroy = function () {
        // 销毁相应事件及raf
        if(this.container){
            this.container.removeEventListener('mouseenter', this._stopScroll)
            this.container.removeEventListener('mouseleave', this._resumeScroll)
            this.container.removeEventListener('mousewheel', this._doWheel)
        }
        cancelAnimationFrame(this.raf)
    }

    return AutoScroll
}))