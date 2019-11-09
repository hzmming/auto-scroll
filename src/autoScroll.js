/*!
 * AutoScroll.js v1.0.1
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
            copyScrollContent: null
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
        // 隐藏滚动轴
        this.container.style.overflow = 'hidden'
        // 滚动内容
        this.scrollContent = this.container.firstElementChild
        this.now = null;
        this.last = Date.now()
        this.interval = 1000/this.config.fps
        this.delta = null;
        this.raf = null;
        this.stop = false
        this.isRequesting = false
        this._stopScroll = null     // mousenter事件用
        this._resumeScroll = null   // mousenter事件用

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

    AutoScroll.prototype._copyScrollContent = function () {
        var result = this.config.copyScrollContent && this.config.copyScrollContent()
        // return false表明不执行之后的复制动作
        if(getPrototype(result) === 'Boolean' && !result) return
        this.scrollContent.innerHTML = this.scrollContent.innerHTML + this.scrollContent.innerHTML
    }

    AutoScroll.prototype._startScroll = function () {
        this.raf = requestAnimationFrame(this._startScroll.bind(this))
        // 场景：悬浮停止
        if(this.stop){
            return;
        }
        // 判断是否滚动到底
        var isEnd = this.container.scrollHeight - this.container.scrollTop === this.container.clientHeight
        if(isEnd){
            // 到底重置.注意，不是重置为0哦
            this._reset()
            // return cancelAnimationFrame(raf)
        }
        this.now = Date.now()
        this.delta = this.now - this.last
        if(this.delta >= this.interval){
            // this.last = this.now
            this.last = this.now - (this.delta % this.interval)
            this._scroll()
            // 执行远程请求，isRequesting保证上一次请求结束才能再发
            this.config.remote && !this.isRequesting && this._remoteMethod()
        }
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
        if(this.config.remote){
            this.container.scrollTop = this.container.scrollHeight - this.container.clientHeight
        }else{
            this.container.scrollTop = this.container.scrollHeight/2 - this.container.clientHeight
        }
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
        }
        cancelAnimationFrame(this.raf)
    }

    return AutoScroll
}))