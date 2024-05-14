new Vue({
    el: "#app",
    data: {
        domain:'http://localhost:8899',
        controlBtnText: "开始识别",
    },
    created() {
        setInterval(() => {
            this.currentTime = new Date().toLocaleTimeString();
        }, 1000);
      },
    methods: {
        onStreamModeClick() {
            window.location.href = "pages/streamMode/index.html"
        },
        onUploadModeClick() {
            window.location.href = "pages/uploadMode/index.html"
        },
        onFileStreamModeClick() {
            window.location.href = "pages/fileStreamMode/index.html"
        },
    }
})
window.onload = function () { 
    console.log("页面加载完毕")
}