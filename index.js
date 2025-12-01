'use strict';

// 引入思源笔记SDK
const siyuan = require('siyuan');

/**
 * 图片操作工具插件
 */
class ImageOperationsPlugin extends siyuan.Plugin {
  /**
   * 构造函数
   */
  constructor() {
    super(...arguments);
    console.log('图片操作工具插件初始化');
  }

  /**
   * 插件加载时执行
   */
  async onload() {
    console.log('图片操作工具插件加载成功');
    // 这里将在后续实现图片点击监听等功能
  }

  /**
   * 插件卸载时执行
   */
  onunload() {
    console.log('图片操作工具插件卸载');
    // 清理事件监听等资源
  }
}

// 导出插件类
module.exports = ImageOperationsPlugin;