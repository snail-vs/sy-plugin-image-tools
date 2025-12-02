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

echo "Zipping plugin..."
zip -r $plugin_dir.zip $plugin_dir
echo "Build and deploy completed successfully!"

echo deploy local...

# local_deployment_dir='/mnd/d/snail/Siyuan/data/plugins/'
local_deployment_dir='/Users/rongfeideng/sada/data/plugins/'
rm -f $local_deployment_dir$plugin_dir.zip
rm -rf "$local_deployment_dir$plugin_dir"
cp -f $plugin_dir.zip $local_deployment_dir
cd $local_deployment_dir
unzip -o $plugin_dir.zip
rm $plugin_dir.zip

cd -
rm -rf $plugin_dir
rm $plugin_dir.zip
rm -rf dist

echo 'deploy local completed successfully!'