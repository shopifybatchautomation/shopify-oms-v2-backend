class ApiResponse{
    constructor(statusCode,message,data=[]){
        this.statusCode = statusCode;
        this.message = message || "Success";
        this.data = data;
        this.success = true;
    }
}

module.exports = ApiResponse;