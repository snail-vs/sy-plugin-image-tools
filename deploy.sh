#!/bin/bash
plugin_dir=sy-plugin-image-tools

# 清理构建目录
rm -rf $plugin_dir
mkdir -p $plugin_dir

# 构建项目
echo "Building project..."
bun run build

# 复制构建文件到插件目录
echo "Copying files..."
cp -f dist/index.js $plugin_dir
cp -f dist/styles.css $plugin_dir/index.css
cp -f plugin.json $plugin_dir
cp -f icon.png $plugin_dir
cp -f preview.png $plugin_dir
cp -f README_zh_CN.md $plugin_dir
cp -f README.md $plugin_dir

echo "Zipping plugin..."
cd $plugin_dir
rm .DS_Store
zip -r $plugin_dir.zip .
mv $plugin_dir.zip package.zip
cd -
echo "Build and deploy completed successfully!"

