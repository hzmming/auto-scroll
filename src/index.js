import {
  getPrototype,
  hasOwnProperty,
  requestAnimationFrame,
  addEventListener,
  removeEventListener,
} from "./util";
import { log } from "./logger";

class AutoScroll {
  constructor(dom, options) {
    this._init(dom, options);
  }

  _init(dom, options) {
    // 默认参数
    this.config = {
      fps: 60, // 帧率
      step: 1, // 一次前进多少.单位：px
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
    };

    // 初始化参数
    if (options instanceof Object) {
      for (let key in options) {
        hasOwnProperty(this.config, key) && (this.config[key] = options[key]);
      }
    }

    // 容器
    this.container =
      typeof dom === "string" ? document.querySelector(dom) : dom;
    if (!this.container) {
      return console.error("dom节点不存在");
    }

    // 子元素列表（是元素element，不包括非element的text、comment节点[node]）
    this.children = this.container.children;

    // 隐藏滚动轴
    this.container.style.overflow = "hidden";
    this.now = null;
    this.lastSuspendTime = this.last = Date.now();
    this.interval = 1000 / this.config.fps;
    this.delta = null;
    this.raf = null;
    this.stop = false;
    this.isRequesting = false;
    this.isCopied = false; // 表示是否复制
    this.isSuspend = false;
    this.suspendScrollTop = 0;
    this.suspendItemIndex = 0;
    const firstChild = this.children.item(0);
    this.suspendItemHeight = firstChild ? firstChild.offsetHeight : 0;
    this._stopScroll = null; // mouseenter事件用
    this._resumeScroll = null; // mouseenter事件用
    this._doWheel = null; // mousewheel事件用

    // 判断是否要滚动
    const needScroll =
      this.container.scrollHeight > this.container.clientHeight;
    if (needScroll) {
      // 拷贝一份滚动内容，为了实现元素循环滚动的假象
      // 如果开启了'数据变化'，便不再复制数据，并且需自己保障每次滚动的数据足够多，不然滚动到底，在新的数据到来时会出现停顿
      !this.config.remote && this._copyScrollContent();
      // 开始滚动
      this._startScroll();
      // 悬浮停止
      this._initHoverEvent();
      // 支持滚轮滚动
      this._initWheelEvent();
    }
  }

  _initHoverEvent() {
    // 开启滚轮滚动的话，悬浮停止滚动
    if (this.config.hoverStop || this.config.wheel) {
      this._stopScroll = this.stopScroll.bind(this);
      this._resumeScroll = this.resumeScroll.bind(this);
      addEventListener(this.container, "mouseenter", this._stopScroll);
      addEventListener(this.container, "mouseleave", this._resumeScroll);
    }
  }

  _initWheelEvent() {
    if (this.config.wheel) {
      this._doWheel = this.doWheel.bind(this);
      addEventListener(this.container, "mousewheel", this._doWheel);
    }
  }

  _copyScrollContent() {
    // 表示是否复制过
    this.isCopied = true;
    const result =
      this.config.copyScrollContent && this.config.copyScrollContent();
    // return false表明不执行之后的复制动作
    if (getPrototype(result) === "Boolean" && !result) return;
    this.container.innerHTML =
      this.container.innerHTML + this.container.innerHTML;
  }

  _startScroll() {
    this.raf = requestAnimationFrame(this._startScroll.bind(this));
    // 场景：悬浮停止
    if (this.stop) {
      return;
    }

    // 更新时间
    this.now = Date.now();
    this.delta = this.now - this.last;

    // 场景：暂停
    if (this.isSuspend) {
      // 判断暂停时间是否结束
      if (this.now - this.lastSuspendTime < this.config.suspendTime) {
        return;
      }
    }

    let scrollHeight = this.container.scrollHeight,
      scrollTop = this.container.scrollTop,
      clientHeight = this.container.clientHeight;

    if (this.config.suspend) {
      let whetherToSuspend = false;
      // 判断是否到暂停距离
      if (this.config.suspendItem) {
        whetherToSuspend =
          scrollTop - this.suspendScrollTop >= this.suspendItemHeight;
      } else {
        whetherToSuspend =
          scrollTop - this.suspendScrollTop >= this.config.suspendStep;
      }
      if (whetherToSuspend) {
        // 输出的距离永远等于suspendStep
        log("距离", scrollTop - this.suspendScrollTop);
        log(
          this.suspendItemIndex,
          this.suspendItemHeight,
          this.children.item(this.suspendItemIndex).innerHTML
        );
        this.suspendScrollTop = scrollTop;
        this.isSuspend = true;
        this.lastSuspendTime = this.now;
        this._updateSuspendItemInfo();
        return;
      }
    }

    // 判断是否滚动到底
    const isEnd = scrollHeight - scrollTop === clientHeight;
    if (isEnd) {
      // 到底重置.注意，不是重置为0哦
      this._reset();
      // return cancelAnimationFrame(raf)
    }

    if (this.delta >= this.interval) {
      // this.last = this.now
      this.last = this.now - (this.delta % this.interval);
      this._scroll();
      // remote相关操作
      this._doRemote();
    }
  }

  _updateSuspendItemInfo() {
    if (this.config.suspendItem) {
      this.suspendItemIndex++;
      // 循环重置
      /**
       * 执行_copyScrollContent方法后，suspendItemIndex会大于实际儿子长度，但因为指向的元素是实际元素拷贝出来的，所以也无所谓
       * 如果想重置到真实的下标，也可以在执行_copyScrollContent方法后，suspendItemIndex -= this.children.length/2[真实儿子长度]
       */
      this.suspendItemIndex >= this.children.length &&
        (this.suspendItemIndex = 0);
      // 开启suspendItemEqual表示儿子高度均等，只需以第一个儿子高度为准，无需重新获取
      this.config.suspendItemEqual ||
        (this.suspendItemHeight = this.children.item(
          this.suspendItemIndex
        ).offsetHeight);
    }
  }

  _doRemote() {
    // 执行远程请求，isRequesting保证上一次请求结束才能再发
    this.config.remote && !this.isRequesting && this._remoteMethod();
  }

  _remoteMethod() {
    // 判断是否需要发请求
    // 不知道会不会造成reflow啊...
    // 默认条件：若滚动轴过1/4，触发请求
    let isNeedRequest = this.config.remoteCondition
      ? this.config.remoteCondition()
      : this.container.scrollTop >= this.container.scrollHeight / 4;
    if (isNeedRequest) {
      this.isRequesting = true;
      this.config.remoteMethod(this, this._finishRequest.bind(this));
    }
  }

  _finishRequest() {
    this.isRequesting = false;
  }

  _reset() {
    log("reset");
    // 自从上次暂停结束后滚动的距离
    let walkDistance = this.container.scrollTop - this.suspendScrollTop;
    if (this.config.remote) {
      this.container.scrollTop =
        this.container.scrollHeight - this.container.clientHeight;
    } else {
      this.container.scrollTop =
        this.container.scrollHeight / 2 - this.container.clientHeight;
    }
    // 因为无缝滚动，所以scrollTop变完后的距离减掉walkDistance就可以推出现在的suspendScrollTop
    this.suspendScrollTop = this.container.scrollTop - walkDistance;
  }

  _scroll() {
    this.container.scrollTop += this.config.step;
  }

  getContainer() {
    return this.container;
  }

  stopScroll() {
    this.stop = true;
  }

  resumeScroll() {
    this.stop = false;
  }

  doWheel(evt) {
    // 当前滚动距离
    let scrollTop = evt.currentTarget.scrollTop;

    // firefox 70.0.1，一次滚动的距离实际上是54，用的DOMMouseScroll测的
    // chrome 78.0.3904.87，一次滚动的距离实际上是53，用的是mousewheel
    // IE没测
    // onwheel还没测
    // 不同浏览器判断条件不一样，以后要优化hzm_to_do
    let isScrollDown = evt.wheelDelta < 0;
    let wheelDistance = isScrollDown ? 53 : -53;
    // 判断是否到真实的底
    let height = this.container.scrollHeight; // 容器展开高度
    let realHeight = this.isCopied ? height / 2 : height; // 容器展开实际高度
    let viewHeight = this.container.offsetHeight; // 可视窗口高度
    let isBegin = false;
    let isEnd = false;
    let walkOnCopy = false; // 是否滚动至复制部分了
    // 若未复制，说明还在无限滚动，将继续发请求
    if (this.isCopied) {
      // 向下滚动
      if (isScrollDown) {
        // 滚动至复制部分
        if (scrollTop + viewHeight > realHeight) {
          // 其实滚动至复制部分就没有判断到底的必要了，因为scrollTop超出实际部分没有意义，而且也无法赋值，写完才发现，写了就写了吧
          isEnd = scrollTop + wheelDistance + viewHeight > height;
          walkOnCopy = true;
        } else {
          // 尚未滚动至复制部分
          isEnd = scrollTop + wheelDistance + viewHeight > realHeight;
        }
        if (isEnd) {
          return (evt.currentTarget.scrollTop = walkOnCopy
            ? height - viewHeight
            : realHeight - viewHeight);
        }
      } else {
        // 向上滚动
        // 判断当前是否完全看不到原始部分
        if (scrollTop >= realHeight) {
          // 表示到顶了
          scrollTop + wheelDistance < realHeight && (isBegin = true);
          if (isBegin) {
            return (evt.currentTarget.scrollTop = realHeight);
          }
        }
      }
    }
    evt.currentTarget.scrollTop += wheelDistance;
    // remote相关操作
    this._doRemote();
  }

  getRemote() {
    return this.config.remote;
  }

  stopRemote() {
    this.config.remote = false;
    this._copyScrollContent();
  }

  destroy() {
    // 销毁相应事件及raf
    if (this.container) {
      removeEventListener(this.container, "mouseenter", this._stopScroll);
      removeEventListener(this.container, "mouseleave", this._resumeScroll);
      removeEventListener(this.container, "mousewheel", this._doWheel);
    }
    cancelAnimationFrame(this.raf);
  }
}

export default AutoScroll;
