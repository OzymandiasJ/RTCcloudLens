new Vue({
    el: '#app',
    data: {
        httpsdomain:"https://fgar.mynatapp.cc",
        selectedFileName: "拖入文件到这里",
        selectedFileSize:0,
        selectedFile: null,
        useHighQuality: false,

        hasStarted: false,
        pc: new RTCPeerConnection(),
        localStream: null,
        mediaRecorder: null,
        recordedBlobs: [],
        commonMsg:"",
        textBtn_text:"未开始识别",
        loaderText:"正在加载",
        useFrontCamera:false,
        selectedModel: "yolov8n.pt",
        selectedCamera: "点击获取摄像头列表",
        modelOptions: [ // 下拉选择框的数据列表
            { text: '细粒度动作识别', value: 'yolov8n-xxx.pt' },
            { text: '关键点检测', value: 'yolov8n-pose.pt' },
            { text: '目标检测', value: 'yolov8n.pt' }
        ],
        cameraOptions: {
            "点击获取摄像头列表":"",
        } // 摄像头设备字典，label-id
            
        
    },
    methods: {
        onFileSelected(event) {
            // 检测是否有文件被选中
            if (event.target.files.length > 0) {
                this.selectedFile = event.target.files[0];
                this.selectedFileName = this.selectedFile.name;
                this.selectedFileSize = this.selectedFile.size;
               
                // 检查是否是视频文件
                if (this.selectedFile.type.startsWith('video')) {
                    // 关闭文件选择框
                    // el=document.getElementsByClassName("file-upload-form")[0]
                    // el.style.display = 'none';
                    // // 创建一个 URL 对象
                    // const fileURL = URL.createObjectURL(this.selectedFile);
                    
                    // // 获取 video 元素并设置其 src 属性
                    // const videoElement = document.getElementById('processed_video');
                    // videoElement.src = fileURL;
                    
                    // // 当视频播放完毕，释放对象 URL
                    // videoElement.onended = () => {
                    //     URL.revokeObjectURL(fileURL);
                    // };
                } else {
                    alert('请选择一个视频文件。');
                }
            }
        },
        async startStream() {
            
    
            try {
                // 确保已选中一个文件
                if (!this.selectedFile) {
                    alert("请先选择一个文件");
                    return;
                }
                this.commonMsg = "初始化资源，建立连接中......";
                console.log("初始化资源，建立连接中");      
                          
                // 创建隐藏的 video 元素用于播放选中的视频文件
                const videoElement = document.createElement('video');
                videoElement.style.display = 'none'; // 隐藏 video 元素
                document.body.appendChild(videoElement); // 将 video 元素添加到文档中
    
                const fileURL = URL.createObjectURL(this.selectedFile);
                videoElement.src = fileURL;
                videoElement.muted=true;
                
    
                // 等待视频加载足够的数据以开始播放
                await new Promise((resolve) => {
                    videoElement.onloadeddata = resolve;
                });
    
                // 使用视频流
                this.localStream = videoElement.captureStream();
                
                // 设置视频轨道的帧率约束
                const videoTrack = this.localStream.getVideoTracks()[0];
                const constraints = {
                    frameRate: { ideal: 10, max: 10 } // 设置帧率为 10Hz
                };
                await videoTrack.applyConstraints(constraints);

                // 加入轨道到 RTCPeerConnection
                this.pc.addTrack(videoTrack, this.localStream);         
                this.displayVideo();
        
                // 创建并发送 SDP offer
                const offer = await this.pc.createOffer();
                await this.pc.setLocalDescription(offer);
        
                // 通过服务器发送 offer 并接收 answer
                const response = await fetch(this.httpsdomain+"/api/offer", {
                    method: "POST",
                    body: JSON.stringify({
                        sdp: this.pc.localDescription.sdp,
                        type: this.pc.localDescription.type,
                        selectedModel: this.selectedModel,
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
        
                this.commonMsg = "连接已建立，开始识别......";
                console.log("连接已建立，开始识别......");
                // 关闭文件上传框
                el=document.getElementsByClassName("file-upload-form")[0]
                el.style.display = 'none';

                const answer = await response.json();
                await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
                videoElement.play(); // 开始播放视频文件
                this.startRecording();
                this.hasStarted = true;
    

            } catch (error) {
                this.commonMsg = `ERROR - ${error}`;
                console.error("ERROR -", error);
            }
        },
        startRecording() {
            let options = { mimeType: 'video/mp4' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: 'video/webm' };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = { mimeType: 'video/mpeg' };
                }
            }
            console.log("使用的mime type:"+options.mimeType)
            try {
                this.mediaRecorder = new MediaRecorder(this.localStream, options);
            } catch (e) {
                console.error('Exception while creating MediaRecorder:', e);
                return;
            }

            // this.mediaRecorder.ondataavailable = (event) => {
            //     if (event.data && event.data.size > 0) {
            //         this.processVideoChunk(event.data);
            //     }
            // };
            // this.mediaRecorder.start(this.chunkSize);  // 设置数据块大小
        },
        processVideoChunk(blob) {
            // 在这里处理视频数据块，例如解码视频、运行AI模型等
            console.log("Received video chunk");
            // 示例：显示Blob大小
            console.log(`Blob size: ${blob.size} bytes`);
        },
        
        finishStream(){
            console.log("结束识别——不保存");
            this.cleanupResources();
            this.commonMsg="";
            this.textBtn_text="点击开始进行新一轮识别";

            // 打开文件上传框
            el=document.getElementsByClassName("file-upload-form")[0]
            el.style.display = 'block';
            this.selectedFile=null;
            this.selectedFileName="拖入文件到这里";
            this.selectedFileSize=null;
        },
        async finishStream_download() {
            console.log("结束识别——并保存");
            console.log(this.mediaRecorder.state)
            this.mediaRecorder.stop();
            this.commonMsg="保存中，请稍等"
            await this.saveVideo();
            this.cleanupResources();
            this.commonMsg="";
            this.textBtn_text="保存完成已下载，感谢使用";



            // 打开文件上传框
            el=document.getElementsByClassName("file-upload-form")[0]
            el.style.display = 'block';
            this.selectedFile=null;
            this.selectedFileName="拖入文件到这里";
            this.selectedFileSize=null;
        },

        displayVideo(){
            // 设置RTCPeerConnection的ontrack事件处理器
            this.pc.ontrack = (event) => {
                if (!this.remoteStream) {
                    this.remoteStream = new MediaStream();
                }
                
                // 将接收到的轨道添加到remoteStream中
                event.streams[0].getTracks().forEach(track => {
                    this.remoteStream.addTrack(track);
                });

                // 显示远程视频流
                document.getElementById('processed_video').srcObject = this.remoteStream;

                // 初始化MediaRecorder来录制远程流
                if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                    this.setupMediaRecorder();
                }
            };
        },

        setupMediaRecorder() {
            if (this.remoteStream) {
                this.recordedBlobs = [];
                
                // 确保使用此远程流初始化MediaRecorder
                this.mediaRecorder = new MediaRecorder(this.remoteStream, { mimeType: 'video/webm' });

                // 开始录制
                this.mediaRecorder.start(10);

                // 当有数据可用时，将其添加到recordedBlobs数组中
                this.mediaRecorder.ondataavailable = event => {
                    if (event.data && event.data.size > 0) {
                        this.recordedBlobs.push(event.data);
                    }
                };

                // 可以添加更多的事件监听器，如录制停止时的处理
                this.mediaRecorder.onstop = () => {
                    // 可以在这里处理录制完成后的逻辑，如下载视频文件
                    console.log("Recording stopped.");
                };
            } else {
                console.error("No remote stream available to record.");
            }
        },

        async saveVideo() {
            const blob = new Blob(this.recordedBlobs, { type: 'video/webm' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'recorded_video.webm';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        },

        cleanupResources() {
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
            }
            this.localStream = null;
            this.pc.close();
            this.pc = new RTCPeerConnection();
            this.hasStarted = false;
            document.getElementById('processed_video').srcObject = null;

            
        },
        onStreamModeClick() {
            window.location.href = "../streamMode/index.html";
        },
        onUploadModeClick() {
            window.location.href = "../uploadMode/index.html";
        },
        onFileStreamModeClick(){
            window.location.href = "../fileStreamMode/index.html";
        },
        onLogoClick(){
            window.location.href = "../../";
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
    },
    mounted() {
        
    }
});
