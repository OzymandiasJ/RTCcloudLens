# RTCcloudLens
基于WebRTC的yolo模型流式识别系统——前端

1. 测试优化中

2. 项目首次由ozymandias开发发布


3. 请注意：
- 调用摄像头的流式识别必须要使用https协议，所以请先启动后端程序(项目链接：后面放)，然后配置流式程序（5001端口）的https域名，将该https域名填到pages\streamMode\index.js和pages\fileStreamMode\index.js的httpsdomain变量的值，保存即可
- 点击开始识别后如果提示摄像头获取失败，请检查浏览器地址url是否是https协议，如果是http的话请修改为https
