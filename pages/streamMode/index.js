
new Vue({
    el: "#app",
    data: {
        domain:'http://localhost:8899',
        controlBtnText: "开始上传",
        loaderText:"正在加载",
        useFrontCamera: false,
        useHighQuality: false,

        uploadedFile: null,
        uploadStatus: 0,//0 未上传，1 上传中，2 已上传并识别完成
        selectedFileName: "拖入文件到这里",
        selectedFileSize:0,
        selectedFile: null,

        downloadedFile:null,
        
        selectedModel: "yolov8n.pt",
        modelOptions: [ // 下拉选择框的数据列表
            { text: '细粒度动作识别', value: 'yolov8n-xxx.pt' },
            { text: '姿势识别', value: 'yolov8n-pose.pt' },
            { text: '物体检测', value: 'yolov8n.pt' }
        ],
    },
    created() {
        setInterval(() => {
            this.currentTime = new Date().toLocaleTimeString();
        }, 1000);
      },
    methods: {
        // methods
        onStreamModeClick() {
            window.location.href = "../streamMode/index.html";
        },
        onUploadModeClick() {
            window.location.href = "../uploadMode/index.html";
        },
        estimateUploadTime(fileSize) { 
            // 100m的带宽，t=size/(100*1024kb/8bit)=size/12800
            es_time = (fileSize / 12800)/60
            return es_time
        },
        estimaReccogTime(fileSize) {
            // 大约
            es_time = fileSize / 12800
            return es_time
        },
        onFileSelected(event) {
            // 检测是否有文件被选中
            if (event.target.files.length > 0) {
                this.selectedFile = event.target.files[0];
                this.selectedFileName = this.selectedFile.name;
                this.selectedFileSize = this.selectedFile.size;
                
            }
        },
        toggleLoaderDisplay() { 
            const el = this.$refs.loader;
            console.log("display:"+el.style.display)
            if (el.style.display == 'none' || el.style.display == '') {
                console.log("显示 loader")
                el.style.display = 'flex';
            } else {
                console.log("隐藏 loader")
                el.style.display = 'none';
            }
        },
        onDownloadButtonClick() {
            console.log(this.uploadedFile)
            const config = {
                responseType: 'blob', // 指示axios以blob形式接收响应体
                params: {
                    fileName: this.uploadedFile // 确保这里正确设置了要下载的文件名
                }
            };

            axios.get(this.domain + "/downloadFile", config)
                .then(response => {
                    // 创建一个URL对象，并且使用它创建一个临时的<a>标签来模拟点击下载
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', this.uploadedFile); // 设置下载的文件名
                    document.body.appendChild(link);
                    link.click();

                    // 清理
                    link.parentNode.removeChild(link);
                    window.URL.revokeObjectURL(url);
                })
                .catch(error => {
                    console.error('Error:', error);
                    // 注意：这里的 error 对象可能不包含 errormsg 字段。这取决于服务器的响应。
                    // 如果服务器返回了一个标准的错误对象，你可能需要访问 error.response.data 或类似的路径来获取实际的错误信息。
                    alert('下载失败');
                });
        },
        onUploadBtnClick() {

            if (this.selectedFile) {
                console.log("上传文件名：" + this.selectedFile.name);
                console.log("上传文件大小：" + this.selectedFile.size+"kb");
                es_time = this.estimateUploadTime(this.selectedFile.size)
                this.loaderText = "正在上传文件，文件大小为：" + this.selectedFile.size + "kb，"+"上传预计需要时间："+es_time+"min"
                this.toggleLoaderDisplay()
                const formData = new FormData();
                formData.append('file', this.selectedFile);
                formData.append('selectedModel', this.selectedModel);
                const config = {
                    params: {

                    },
                    headers: {

                    }
                };
                axios.post(this.domain + "/upload",formData, config)
                    .then(response => {
                        console.log('Success:', response.data);
                        // alert('文件上传成功');
                        // alert(response.data.uuid); // 假设服务器响应包含一个 uuid 字段
                        console.log("文件名：" + response.data.savedFileName)
                        localStorage.setItem("uploadedFile", response.data.savedFileName)
                        this.uploadedFile = response.data.savedFileName
                        this.uploadStatus = 1
                        this.loaderText = "上传完成，正在处理，请稍等"
                        //启动任务查询器
                        this.getTaskStatus()
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('文件上传失败');
                    });
            } else {
                alert('请先选择一个文件');
            }
        },
        getTaskStatus() {
            let intervalID = setInterval(() => {
                // 请求下载文件
                const config = {
                    params: {
                        "fileName": this.uploadedFile
                    }
                };
                axios.get(this.domain + "/getTaskStatus", config)
                    .then(response => {
                        taskStatus = response.data.status
                        if (taskStatus == 1 || taskStatus == "1") {
                            const el = this.$refs.loader;
                            this.toggleLoaderDisplay()
                            clearInterval(intervalID)
                            this.uploadStatus = 2
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('查询失败,原因：' + error.errormsg);
                    });
                if (this.uploadedFile == null) {
                    clearInterval(intervalID)

                }
            }, 1000);
        },







        // methods
    } 
})
window.onload = function () { 
    console.log("页面加载完毕")
    uploadedFile = localStorage.getItem("uploadedFile")
    if (this.uploadedFile == null || this.uploadedFile == "") { 

    }

    const livePusher = new TXLivePusher();
    livePusher.setRenderView('local_video');
    // 设置视频质量
    livePusher.setVideoQuality('640p');
    // 设置音频质量
    // livePusher.setAudioQuality('standard');
    // 自定义设置帧率
    livePusher.setProperty('setVideoFPS', 25);
    // 打开摄像头
    livePusher.// 采集完摄像头画面后自动推流
    livePusher.startCamera()
    .then(function () {
        livePusher.startPush('webrtc://localhost/CloudLens/FGAR?txSecret=xxx&txTime=xxx');
    })
    .catch(function (error) {
     console.log('打开摄像头失败: '+ error.toString());
    });
    
    



    // 停止直播推流：
    // livePusher.stopPush();
    // 停止采集音视频流：
    // // 关闭摄像头
    // livePusher.stopCamera();
    // // 关闭麦克风
    // livePusher.stopMicrophone();




    
    

}