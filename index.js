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
    // 创建浮动面板
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
        <button class="image-operations-button" id="preview" title="预览图片">
          🔍
        </button>
        <button class="image-operations-button" id="save" title="保存图片">
          💾
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
        <div class="image-operations-preview-header">
          <button class="image-operations-preview-close" id="preview-close">×</button>
        </div>
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

    // 预览按钮事件
    this.floatPanel.querySelector('#preview').addEventListener('click', () => {
      this.showPreview();
    });

    // 保存按钮事件
    this.floatPanel.querySelector('#save').addEventListener('click', () => {
      this.saveImage();
    });
  }

  /**
   * 绑定预览面板事件
   */
  bindPreviewPanelEvents() {
    // 关闭预览
    this.previewPanel.querySelector('#preview-close').addEventListener('click', () => {
      this.hidePreview();
    });

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
        this.showFloatPanel(target, e.clientX, e.clientY);
      } else {
        // 点击其他区域隐藏浮动面板
        this.hideFloatPanel();
      }
    });
  }

  /**
   * 显示浮动操作面板
   * @param {HTMLImageElement} image - 点击的图片元素
   * @param {number} x - 鼠标X坐标
   * @param {number} y - 鼠标Y坐标
   */
  showFloatPanel(image, x, y) {
    this.currentImage = image;
    this.floatPanel.style.left = `${x}px`;
    this.floatPanel.style.top = `${y}px`;
    this.floatPanel.style.display = 'block';
  }

  /**
   * 隐藏浮动操作面板
   */
  hideFloatPanel() {
    this.floatPanel.style.display = 'none';
    this.currentImage = null;
  }

  /**
   * 显示图片预览
   */
  showPreview() {
    if (!this.currentImage) return;
    
    const previewImage = this.previewPanel.querySelector('#preview-image');
    previewImage.src = this.currentImage.src;
    this.previewPanel.style.display = 'block';
  }

  /**
   * 隐藏图片预览
   */
  hidePreview() {
    this.previewPanel.style.display = 'none';
  }

  /**
   * 旋转图片
   * @param {number} angle - 旋转角度
   */
  rotateImage(angle) {
    if (!this.currentImage) return;
    
    // 获取当前旋转角度
    let currentAngle = parseInt(this.currentImage.dataset.rotate || '0');
    
    // 计算新的旋转角度
    let newAngle = (currentAngle + angle) % 360;
    if (newAngle < 0) {
      newAngle += 360;
    }
    
    // 应用旋转效果
    this.currentImage.style.transform = `rotate(${newAngle}deg)`;
    this.currentImage.dataset.rotate = newAngle;
    
    // 更新预览图（如果预览面板打开）
    const previewImage = this.previewPanel.querySelector('#preview-image');
    if (previewImage.src === this.currentImage.src && this.previewPanel.style.display === 'block') {
      previewImage.style.transform = `rotate(${newAngle}deg)`;
      previewImage.dataset.rotate = newAngle;
    }
  }

  /**
   * 保存图片
   */
  saveImage() {
    if (!this.currentImage) return;
    
    const image = this.currentImage;
    const rotate = parseInt(image.dataset.rotate || '0');
    
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