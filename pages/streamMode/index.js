

new Vue({
    el: '#app',
    data: {
        httpsdomain:"https://fgar.mynatapp.cc",
        hasStarted: false,
        pc: new RTCPeerConnection(),
        localStream: null,
        mediaRecorder: null,
        saveFileMimeType:{ mimeType: 'video/mp4' },
        recordedBlobs: [],
        commonMsg:"",
        textBtn_text:"未开始识别",
        loaderText:"正在加载",
        useFrontCamera:false,
        selectedModel: "yolov8n.pt",
        selectedCamera: "点击获取摄像头",
        modelOptions: [ // 下拉选择框的数据列表
            { text: '细粒度动作识别', value: 'yolov8n-xxx.pt' },
            { text: '关键点检测', value: 'yolov8n-pose.pt' },
            { text: '目标检测', value: 'yolov8n.pt' }
        ],
        cameraOptions: {
            "点击获取摄像头":"",
        } // 摄像头设备字典，label-id
            
        
    },
    methods: {
        async getCameraDevices() {
            // First, try to access the user's media to prompt for permission if not already granted
            try {
                await navigator.mediaDevices.getUserMedia({ video: true , audio: false});
            } catch (error) {
                console.error("Error accessing media devices:", error);
            }
        
            // Now enumerate devices as permissions are likely granted
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
            let camera_dict = {};
            let count = 1; // Counter to label unnamed cameras
        
            for (let device of videoDevices) {
                let label = device.label || `Camera ${count++}`; // Provide a generic label if none is available
                if (!label) {
                    // Additional logic to differentiate between front and back cameras on mobile devices
                    // This is a basic heuristic and might need adjustment depending on the device
                    label = device.facing === 'user' ? 'Front Camera' : 'Rear Camera';
                }
                camera_dict[label] = device.deviceId;
            }
        
            return camera_dict;
        },
        async startCamera() {
            this.commonMsg = "初始化资源，建立连接中......";
            console.log(this.commonMsg);
            this.textBtn_text=""
            try {
                if (this.cameraOptions.size==0){
                    alert("没有可用的摄像头设备！")
                    return;
                }
                const deviceId = await this.cameraOptions[this.selectedCamera];
                console.log("deviceId:",deviceId)
                // 用户不选择的话用默认摄像头
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        deviceId: deviceId,
                    },
                    audio: false,
                });

                // 设置视频轨道的帧率约束
                const videoTrack = this.localStream.getVideoTracks()[0];
                const constraints = {
                    frameRate: { ideal: 10, max: 10 } // 设置帧率为 10Hz
                };
                await videoTrack.applyConstraints(constraints);
                console.log("设置视频轨道的帧率约束:"+constraints.frameRate.ideal)
                
                this.pc.addTrack(videoTrack, this.localStream);    
    
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
                console.log(this.commonMsg);
                const answer = await response.json();
                this.displayVideo();
                console.log("setRemoteDescription中")
                await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
                console.log("setRemoteDescription完成")
                this.hasStarted = true;
            } catch (error) {
                this.commonMsg = `ERROR: 无法获取摄像头, 请检查摄像头设备 - ${error}`;
                alert(`ERROR: 无法获取摄像头, 请检查摄像头设备 - ${error}`);
                console.error("Camera initialization failed:", error);
            }
        },
        
        finishCamera(){
            console.log("结束识别——不保存");
            this.cleanupResources();
            this.commonMsg="";
            this.textBtn_text="点击开始进行新一轮识别";
        },
        async finishCamera_download() {
            console.log("结束识别——并保存");
            if (this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
            }else{
                alert("ERROR:录制未开始");
            }
            this.commonMsg="保存中，请稍等"
            await this.saveVideo();
            this.cleanupResources();
            this.commonMsg="";
            this.textBtn_text="保存完成已下载，感谢使用";
        },

        displayVideo(){
            // 设置RTCPeerConnection的ontrack事件处理器
            this.pc.ontrack = (event) => {
                console.log("ontrack")
                if (!this.remoteStream) {
                    this.remoteStream = new MediaStream();
                }
                
                // 将接收到的轨道添加到remoteStream中
                event.streams[0].getTracks().forEach(track => {
                    this.remoteStream.addTrack(track);
                });

                // 显示远程视频流
                document.getElementById('video').srcObject = this.remoteStream;

                // 初始化MediaRecorder来录制远程流
                if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                    this.setupMediaRecorder();
                }
            };
        },

        setupMediaRecorder() {
            if (this.remoteStream) {
                this.recordedBlobs = [];
                
                if (!MediaRecorder.isTypeSupported(this.saveFileMimeType.mimeType)) {
                    console.log(this.saveFileMimeType.mimeType + ' is not supported, trying different MIME type.');
                    this.saveFileMimeType.mimeType = 'video/webm';  // 尝试其他 MIME 类型
                    if (!MediaRecorder.isTypeSupported(this.saveFileMimeType.mimeType)) {
                        console.error('No supported MIME types for MediaRecorder.');
                        return;
                    }
                }
                console.log("使用的mime type:"+this.saveFileMimeType.mimeType)
                // 使用支持的 MIME 类型初始化 MediaRecorder
                this.mediaRecorder = new MediaRecorder(this.remoteStream, this.saveFileMimeType);
        
                // 开始录制
                this.mediaRecorder.start(10);
                //10 这个参数指的是时间切片（timeslice）的长度，单位是毫秒。
                //当指定此参数时，MediaRecorder 会每隔给定的时间段（在这里是每10毫秒）触发一个 dataavailable 事件，
                //该事件生成包含从上一次事件（或开始录制）以来记录的媒体数据的 Blob 对象。
        
                // 当有数据可用时，将其添加到 recordedBlobs 数组中
                this.mediaRecorder.ondataavailable = event => {
                    if (event.data && event.data.size > 0) {
                        this.recordedBlobs.push(event.data);
                    }
                };
        
                // 录制停止时的处理
                this.mediaRecorder.onstop = () => {
                    console.log("Recording stopped.");
                };
            } else {
                console.error("No remote stream available to record.");
            }
        },

        async saveVideo() {
            const blob = new Blob(this.recordedBlobs, { type: this.saveFileMimeType.mimeType });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            if (this.saveFileMimeType.mimeType=="video/webm"){
                a.download = 'recorded_video.webm';
            }
            else {
                a.download = 'recorded_video.mp4';
            }
                
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
            document.getElementById('video').srcObject = null;
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
        async onselectCameraClick(){
            console.log("点击获取摄像头" in this.cameraOptions);
            if (! ("点击获取摄像头" in this.cameraOptions)) {
                return;
            }
            let camera_dict = await this.getCameraDevices();
            console.log("可用摄像头设备：", camera_dict);
            if(camera_dict.size==0){
                alert("没有可用的摄像头设备！")
                return;
            }
            this.cameraOptions = camera_dict;
            // Set the default camera if any are available
            if (Object.keys(camera_dict).length > 0) {
                this.selectedCamera = Object.keys(camera_dict)[0];
            }
        }
    },
    mounted() {
        
    }
});
