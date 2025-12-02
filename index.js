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
    this.currentImage = null;
    this.floatPanel = null;
    this.previewPanel = null;
    this.previewRotation = 0; // 预览图片的旋转角度(独立于原图)
  }

  /**
   * 插件加载时执行
   */
  async onload() {
    console.log('图片操作工具插件加载成功');
    this.initFloatPanel();
    this.initPreviewPanel();
    this.bindEvents();
  }

  /**
   * 初始化浮动操作面板
   */
  initFloatPanel() {
    // 创建底部工具栏
    this.floatPanel = document.createElement('div');
    this.floatPanel.className = 'image-operations-float-panel';
    this.floatPanel.innerHTML = `
      <div class="image-operations-toolbar">
        <button class="image-operations-button" id="rotate-left" title="逆时针旋转">
          ↺
        </button>
        <button class="image-operations-button" id="rotate-right" title="顺时针旋转">
          ↻
        </button>
        <button class="image-operations-button" id="save" title="保存图片">
          💾
        </button>
        <button class="image-operations-button" id="close-preview" title="关闭预览">
          ✕
        </button>
      </div>
    `;
    document.body.appendChild(this.floatPanel);

    // 绑定按钮事件
    this.bindFloatPanelEvents();
  }

  /**
   * 初始化预览面板
   */
  initPreviewPanel() {
    // 创建预览面板
    this.previewPanel = document.createElement('div');
    this.previewPanel.className = 'image-operations-preview-panel';
    this.previewPanel.innerHTML = `
      <div class="image-operations-preview-overlay"></div>
      <div class="image-operations-preview-content">
        <div class="image-operations-preview-body">
          <img id="preview-image" src="" alt="Preview" />
        </div>
      </div>
    `;
    document.body.appendChild(this.previewPanel);

    // 绑定预览面板事件
    this.bindPreviewPanelEvents();
  }

  /**
   * 绑定浮动面板事件
   */
  bindFloatPanelEvents() {
    // 旋转按钮事件
    this.floatPanel.querySelector('#rotate-left').addEventListener('click', () => {
      this.rotateImage(-90);
    });

    this.floatPanel.querySelector('#rotate-right').addEventListener('click', () => {
      this.rotateImage(90);
    });

    // 保存按钮事件
    this.floatPanel.querySelector('#save').addEventListener('click', () => {
      this.saveImage();
    });

    // 关闭预览事件
    this.floatPanel.querySelector('#close-preview').addEventListener('click', () => {
      this.hidePreview();
    });
  }

  /**
   * 绑定预览面板事件
   */
  bindPreviewPanelEvents() {
    // 点击遮罩关闭预览
    this.previewPanel.querySelector('.image-operations-preview-overlay').addEventListener('click', () => {
      this.hidePreview();
    });
  }

  /**
   * 绑定全局事件
   */
  bindEvents() {
    // 监听图片点击事件
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target.tagName === 'IMG') {
        e.preventDefault();
        e.stopPropagation();
        this.showPreviewWithToolbar(target);
      } else if (!this.floatPanel.contains(target) && !this.previewPanel.contains(target)) {
        // 点击其他区域且不是工具栏和预览面板内元素时隐藏
        this.hidePreview();
      }
    });
  }

  /**
   * 显示图片预览和底部工具栏
   * @param {HTMLImageElement} image - 点击的图片元素
   */
  showPreviewWithToolbar(image) {
    this.currentImage = image;

    // 显示预览面板
    this.showPreview();

    // 显示底部工具栏
    this.floatPanel.style.display = 'block';
    // Force reflow
    this.floatPanel.offsetHeight;
    this.floatPanel.classList.add('active');

    // 动态调整工具栏位置
    this.updateToolbarPosition();
  }

  /**
   * 更新工具栏位置（紧挨图片底部或屏幕底部）
   */
  updateToolbarPosition() {
    const previewImage = this.previewPanel.querySelector('#preview-image');
    if (!previewImage) return;

    // 等待图片加载和动画完成
    setTimeout(() => {
      const imageRect = previewImage.getBoundingClientRect();
      const imageBottom = imageRect.bottom;
      const viewportHeight = window.innerHeight;
      const toolbarHeight = this.floatPanel.offsetHeight;

      // 如果图片底部在视窗内，工具栏紧挨图片底部
      // 否则固定在屏幕底部
      if (imageBottom + toolbarHeight + 20 <= viewportHeight) {
        // 图片底部 + 一点间距
        this.floatPanel.style.bottom = 'auto';
        this.floatPanel.style.top = `${imageBottom + 10}px`;
      } else {
        // 固定在屏幕底部
        this.floatPanel.style.top = 'auto';
        this.floatPanel.style.bottom = '30px';
      }
    }, 350); // 等待预览面板动画完成
  }

  /**
   * 显示图片预览
   */
  showPreview() {
    if (!this.currentImage) return;

    // 重置预览旋转角度
    this.previewRotation = 0;

    const previewImage = this.previewPanel.querySelector('#preview-image');
    previewImage.src = this.currentImage.src;
    previewImage.style.transform = 'rotate(0deg)'; // 预览图片总是从0度开始

    this.previewPanel.style.display = 'block';
    // Force reflow to enable transition
    this.previewPanel.offsetHeight;
    this.previewPanel.classList.add('active');
  }

  /**
   * 隐藏图片预览和工具栏
   */
  hidePreview() {
    this.previewPanel.classList.remove('active');
    this.floatPanel.classList.remove('active');

    // Wait for transition to finish before hiding display
    setTimeout(() => {
      if (!this.previewPanel.classList.contains('active')) {
        this.previewPanel.style.display = 'none';
        this.floatPanel.style.display = 'none';
      }
    }, 300);

    this.currentImage = null;
  }

  /**
   * 旋转图片
   * @param {number} angle - 旋转角度
   */
  rotateImage(angle) {
    if (!this.currentImage) return;

    // 使用累积角度，不取模，避免动画反向
    this.previewRotation += angle;

    // 只旋转预览图，不影响文档中的原图
    const previewImage = this.previewPanel.querySelector('#preview-image');
    if (previewImage && this.previewPanel.style.display === 'block') {
      previewImage.style.transform = `rotate(${this.previewRotation}deg)`;

      // 旋转后重新计算工具栏位置
      this.updateToolbarPosition();
    }
  }

  /**
   * 保存图片
   */
  saveImage() {
    if (!this.currentImage) return;

    const image = this.currentImage;
    // 将累积角度标准化到 0-360 范围
    const rotate = ((this.previewRotation % 360) + 360) % 360;

    // 创建Canvas元素
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 加载原图
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // 根据旋转角度调整Canvas大小
      if (rotate === 90 || rotate === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      // 旋转Canvas上下文
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rotate * Math.PI / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      // 转换为Blob并保存
      canvas.toBlob((blob) => {
        if (blob) {
          // 创建下载链接
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.getFileNameFromUrl(image.src);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    };
    img.src = image.src;
  }

  /**
   * 从URL中获取文件名
   * @param {string} url - 图片URL
   * @returns {string} - 文件名
   */
  getFileNameFromUrl(url) {
    // 从URL中提取文件名
    const parts = url.split('/');
    let filename = parts[parts.length - 1];

    // 移除查询参数
    const queryIndex = filename.indexOf('?');
    if (queryIndex > -1) {
      filename = filename.substring(0, queryIndex);
    }

    // 移除哈希值
    const hashIndex = filename.indexOf('#');
    if (hashIndex > -1) {
      filename = filename.substring(0, hashIndex);
    }

    return filename;
  }

  /**
   * 插件卸载时执行
   */
  onunload() {
    console.log('图片操作工具插件卸载');
    // 清理事件监听等资源
    if (this.floatPanel) {
      document.body.removeChild(this.floatPanel);
    }
    if (this.previewPanel) {
      document.body.removeChild(this.previewPanel);
    }
  }
}

// 导出插件类
module.exports = ImageOperationsPlugin;