export function getPrototype(obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
}

export function hasOwnProperty(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

// https://github.com/ecomfe/zrender/blob/master/src/animation/requestAnimationFrame.js
export const requestAnimationFrame =
  (typeof window !== "undefined" &&
    ((window.requestAnimationFrame &&
      window.requestAnimationFrame.bind(window)) ||
      // https://github.com/ecomfe/zrender/issues/189#issuecomment-224919809
      (window.msRequestAnimationFrame &&
        window.msRequestAnimationFrame.bind(window)) ||
      window.mozRequestAnimationFrame ||
      window.webkitRequestAnimationFrame)) ||
  function (func) {
    // 60 fps
    setTimeout(func, 16);
  };

// https://github.com/ecomfe/zrender/blob/master/src/core/event.js
const isDomLevel2 = typeof window !== "undefined" && !!window.addEventListener;
export function addEventListener(el, name, handler, opt) {
  if (isDomLevel2) {
    el.addEventListener(name, handler, opt);
  } else {
    el.attachEvent("on" + name, handler);
  }
}
export function removeEventListener(el, name, handler, opt) {
  if (isDomLevel2) {
    el.removeEventListener(name, handler, opt);
  } else {
    el.detachEvent("on" + name, handler);
  }
}
