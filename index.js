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

    // 缩放相关状态
    this.previewScale = 1;        // 当前缩放比例
    this.minScale = 0.5;          // 最小缩放比例
    this.maxScale = 3;            // 最大缩放比例
    this.scaleStep = 0.05;        // 缩放步长 5%

    // 拖拽相关状态
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.translateX = 0;
    this.translateY = 0;

    // 触摸相关状态
    this.initialPinchDistance = 0;
    this.lastPinchScale = 1;
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
        <span class="image-operations-divider"></span>
        <button class="image-operations-button" id="zoom-out" title="缩小 (-)">
          −
        </button>
        <span class="image-operations-scale-display" id="scale-display">100%</span>
        <button class="image-operations-button" id="zoom-in" title="放大 (+)">
          +
        </button>
        <button class="image-operations-button" id="zoom-reset" title="重置大小 (0)">
          ⊙
        </button>
        <span class="image-operations-divider"></span>
        <button class="image-operations-button" id="save" title="保存图片">
          💾
        </button>
        <button class="image-operations-button" id="close-preview" title="关闭预览 (Esc)">
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

    // 缩放按钮事件
    this.floatPanel.querySelector('#zoom-out').addEventListener('click', () => {
      this.zoomImage(-this.scaleStep);
    });

    this.floatPanel.querySelector('#zoom-in').addEventListener('click', () => {
      this.zoomImage(this.scaleStep);
    });

    this.floatPanel.querySelector('#zoom-reset').addEventListener('click', () => {
      this.resetZoom();
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
    const previewImage = this.previewPanel.querySelector('#preview-image');
    const previewContent = this.previewPanel.querySelector('.image-operations-preview-content');
    const previewOverlay = this.previewPanel.querySelector('.image-operations-preview-overlay');

    // 点击遮罩层关闭预览
    previewOverlay.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hidePreview();
    });

    // 点击预览内容区域（非图片）也关闭预览
    previewContent.addEventListener('click', (e) => {
      // 只有点击的是内容区域本身（不是图片）时才关闭
      if (e.target === previewContent) {
        e.stopPropagation();
        this.hidePreview();
      }
    });

    // 滚轮缩放
    previewImage.addEventListener('wheel', (e) => {
      e.preventDefault();

      const delta = e.deltaY > 0 ? -this.scaleStep : this.scaleStep;
      const oldScale = this.previewScale;
      const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.previewScale + delta));

      if (newScale !== oldScale) {
        // 计算缩放中心点偏移,以鼠标位置为中心
        const rect = previewImage.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;

        const scaleRatio = newScale / oldScale;
        this.translateX = this.translateX * scaleRatio + mouseX * (1 - scaleRatio);
        this.translateY = this.translateY * scaleRatio + mouseY * (1 - scaleRatio);

        this.previewScale = newScale;
        this.applyTransform();
        this.updateScaleDisplay();
      }
    }, { passive: false });

    // 双击重置
    previewImage.addEventListener('dblclick', () => {
      this.resetZoom();
    });

    // 拖拽移动
    previewImage.addEventListener('mousedown', (e) => {
      // 任何缩放比例都支持拖拽
      this.isDragging = true;
      this.dragStartX = e.clientX - this.translateX;
      this.dragStartY = e.clientY - this.translateY;
      previewImage.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.translateX = e.clientX - this.dragStartX;
        this.translateY = e.clientY - this.dragStartY;
        this.applyTransform();
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        const previewImage = this.previewPanel.querySelector('#preview-image');
        previewImage.style.cursor = 'grab';
      }
    });

    // 触摸事件支持
    this.bindTouchEvents(previewImage);
  }

  /**
   * 绑定触摸事件（支持双指缩放和单指拖拽）
   * @param {HTMLElement} previewImage - 预览图片元素
   */
  bindTouchEvents(previewImage) {
    let touchStartX = 0;
    let touchStartY = 0;
    let isTouching = false;

    // 触摸开始
    previewImage.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        // 单指拖拽
        isTouching = true;
        touchStartX = e.touches[0].clientX - this.translateX;
        touchStartY = e.touches[0].clientY - this.translateY;
        e.preventDefault();
      } else if (e.touches.length === 2) {
        // 双指缩放
        isTouching = false; // 停止拖拽
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        this.initialPinchDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        this.lastPinchScale = this.previewScale;
        e.preventDefault();
      }
    }, { passive: false });

    // 触摸移动
    previewImage.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && isTouching) {
        // 单指拖拽
        this.translateX = e.touches[0].clientX - touchStartX;
        this.translateY = e.touches[0].clientY - touchStartY;
        this.applyTransform();
        e.preventDefault();
      } else if (e.touches.length === 2) {
        // 双指缩放
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );

        if (this.initialPinchDistance > 0) {
          const scaleChange = currentDistance / this.initialPinchDistance;
          const newScale = Math.max(
            this.minScale,
            Math.min(this.maxScale, this.lastPinchScale * scaleChange)
          );

          if (newScale !== this.previewScale) {
            // 计算两指中心点
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;

            // 计算相对于图片的中心点偏移
            const rect = previewImage.getBoundingClientRect();
            const offsetX = centerX - rect.left - rect.width / 2;
            const offsetY = centerY - rect.top - rect.height / 2;

            // 调整平移以保持缩放中心点位置
            const scaleRatio = newScale / this.previewScale;
            this.translateX = this.translateX * scaleRatio + offsetX * (1 - scaleRatio);
            this.translateY = this.translateY * scaleRatio + offsetY * (1 - scaleRatio);

            this.previewScale = newScale;
            this.applyTransform();
            this.updateScaleDisplay();
          }
        }
        e.preventDefault();
      }
    }, { passive: false });

    // 触摸结束
    previewImage.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        isTouching = false;
        this.initialPinchDistance = 0;
      } else if (e.touches.length === 1) {
        // 从双指变为单指，重新初始化拖拽
        isTouching = true;
        touchStartX = e.touches[0].clientX - this.translateX;
        touchStartY = e.touches[0].clientY - this.translateY;
        this.initialPinchDistance = 0;
      }
    });

    // 触摸取消
    previewImage.addEventListener('touchcancel', () => {
      isTouching = false;
      this.initialPinchDistance = 0;
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
      }
    });

    // 键盘快捷键 - 使用捕获阶段以提高优先级
    document.addEventListener('keydown', (e) => {
      // 检查预览面板是否激活
      if (this.previewPanel && this.previewPanel.classList.contains('active')) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.hidePreview();
          return;
        }

        switch (e.key) {
          case '+':
          case '=':
            e.preventDefault();
            this.zoomImage(this.scaleStep);
            break;
          case '-':
            e.preventDefault();
            this.zoomImage(-this.scaleStep);
            break;
          case '0':
            e.preventDefault();
            this.resetZoom();
            break;
        }
      }
    }, true); // 使用捕获阶段
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

    // 重置所有状态
    this.previewRotation = 0;
    this.previewScale = 1;
    this.translateX = 0;
    this.translateY = 0;

    const previewImage = this.previewPanel.querySelector('#preview-image');
    previewImage.src = this.currentImage.src;
    previewImage.style.cursor = 'grab';
    this.applyTransform();
    this.updateScaleDisplay();

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

    // 使用累积角度,不取模,避免动画反向
    this.previewRotation += angle;

    // 只旋转预览图,不影响文档中的原图
    const previewImage = this.previewPanel.querySelector('#preview-image');
    if (previewImage && this.previewPanel.style.display === 'block') {
      this.applyTransform();

      // 旋转后重新计算工具栏位置
      this.updateToolbarPosition();
    }
  }

  /**
   * 应用变换(缩放、旋转、平移)
   */
  applyTransform() {
    const previewImage = this.previewPanel.querySelector('#preview-image');
    if (!previewImage) return;

    // 组合所有变换: 先平移,再旋转,最后缩放
    previewImage.style.transform =
      `translate(${this.translateX}px, ${this.translateY}px) 
       rotate(${this.previewRotation}deg) 
       scale(${this.previewScale})`;
  }

  /**
   * 缩放图片
   * @param {number} delta - 缩放增量
   */
  zoomImage(delta) {
    if (!this.currentImage) return;

    const oldScale = this.previewScale;
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.previewScale + delta));

    if (newScale !== oldScale) {
      // 按钮缩放以图片中心为基准,不需要调整translate
      this.previewScale = newScale;
      this.applyTransform();
      this.updateScaleDisplay();
    }
  }

  /**
   * 重置缩放
   */
  resetZoom() {
    if (!this.currentImage) return;

    this.previewScale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.applyTransform();
    this.updateScaleDisplay();
  }

  /**
   * 更新缩放比例显示
   */
  updateScaleDisplay() {
    const scaleDisplay = this.floatPanel.querySelector('#scale-display');
    if (scaleDisplay) {
      scaleDisplay.textContent = `${Math.round(this.previewScale * 100)}%`;
    }
  }

  /**
   * 保存图片(覆盖原图)
   */
  async saveImage() {
    if (!this.currentImage) return;

    const image = this.currentImage;
    // 将累积角度标准化到 0-360 范围
    const rotate = ((this.previewRotation % 360) + 360) % 360;

    // 如果没有旋转,不需要保存
    if (rotate === 0) {
      this.showMessage('图片未旋转,无需保存', 'info');
      return;
    }

    // 创建Canvas元素
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 加载原图
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
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

        // 转换为Blob
        canvas.toBlob(async (blob) => {
          if (!blob) {
            this.showMessage('图片处理失败', 'error');
            return;
          }

          // 尝试覆盖原图
          const success = await this.overwriteImage(image.src, blob);

          if (success) {
            // 覆盖成功,刷新图片显示
            this.refreshImage(image);
            this.showMessage('保存成功', 'success');

            // 重置预览旋转角度
            this.previewRotation = 0;
            this.applyTransform();
          } else {
            // 覆盖失败,回退到另存为
            this.showMessage('覆盖失败,使用另存为', 'warning');
            this.downloadImage(blob, this.getFileNameFromUrl(image.src));
          }
        }, 'image/png');
      } catch (error) {
        console.error('保存图片失败:', error);
        this.showMessage('保存失败: ' + error.message, 'error');
      }
    };

    img.onerror = () => {
      this.showMessage('图片加载失败', 'error');
    };

    img.src = image.src;
  }

  /**
   * 覆盖原图文件
   * @param {string} imageSrc - 图片URL
   * @param {Blob} blob - 图片数据
   * @returns {Promise<boolean>} - 是否成功
   */
  async overwriteImage(imageSrc, blob) {
    try {
      // 从URL中提取路径
      const url = new URL(imageSrc);
      const pathname = url.pathname; // "/assets/image-xxx.png"

      // 去掉开头的斜杠,然后添加 data/ 前缀
      const relativePath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
      const filePath = 'data/' + relativePath;

      // 获取文件名
      const filename = this.getFileNameFromUrl(imageSrc);

      // 构造FormData
      const formData = new FormData();
      formData.append('path', filePath);
      formData.append('isDir', 'false');
      formData.append('modTime', Math.floor(Date.now() / 1000).toString());
      formData.append('file', blob, filename);

      // 调用思源API
      const response = await fetch('/api/file/putFile', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        console.error('API调用失败:', response.status, response.statusText);
        return false;
      }

      const result = await response.json();
      return result.code === 0;
    } catch (error) {
      console.error('覆盖图片失败:', error);
      return false;
    }
  }

  /**
   * 刷新图片显示(添加时间戳强制刷新)
   * @param {HTMLImageElement} image - 图片元素
   */
  refreshImage(image) {
    // 移除旧的时间戳参数
    const baseUrl = image.src.split('?')[0];
    // 添加新的时间戳参数强制刷新
    image.src = baseUrl + '?t=' + Date.now();

    // 同时刷新预览图片
    const previewImage = this.previewPanel.querySelector('#preview-image');
    if (previewImage) {
      previewImage.src = image.src;
    }
  }

  /**
   * 下载图片(另存为)
   * @param {Blob} blob - 图片数据
   * @param {string} filename - 文件名
   */
  downloadImage(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 显示消息提示
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型: success/error/warning/info
   */
  showMessage(message, type = 'info') {
    // 创建消息元素
    const messageEl = document.createElement('div');
    messageEl.className = `image-operations-message image-operations-message-${type}`;
    messageEl.textContent = message;
    document.body.appendChild(messageEl);

    // 显示动画
    setTimeout(() => {
      messageEl.classList.add('active');
    }, 10);

    // 3秒后自动隐藏
    setTimeout(() => {
      messageEl.classList.remove('active');
      setTimeout(() => {
        document.body.removeChild(messageEl);
      }, 300);
    }, 3000);
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