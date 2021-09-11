class Chunks {
    constructor(chunk, PartNumber){
        this.chunk = chunk
        this.partNumber = PartNumber
    }
}
const MIN_SIZE = 6000000
const BASE_URL = "https://8hqp2xgk6f.execute-api.us-east-1.amazonaws.com/dev/";
// const BASE_URL = "https://bauuv39b7h.execute-api.us-east-1.amazonaws.com/dev/";

class AWSStorage {

    constructor(FileName){
        this.FileName = FileName
        this.startUploadPromise=this.startUpload(FileName)
        this.uploaded = {}
        this.chunks = []
        this.promises = []
        this.promisesPart = []
        this.UploadId = null
        this.PartNumber = 1
    }

    startUpload = async (uuid) => {
        const START_MULTIPARTUPLOAD_URL = "upload/start"
        const res = await fetch(BASE_URL + START_MULTIPARTUPLOAD_URL + "?FileName="+ uuid)
        console.log("In the startMultiUpload Request" + res)
        return res.json()
    }

    uploadFirst = async (metadataSize, refinedMetadataBuf, readAsArrayBuffer) => {
        console.log('In the uploadFirst method');
        var newChunk = this.chunks[0]['chunk']
        const partNumber = 1
        const UploadUrl = await (await this.getUploadUrl(partNumber, newChunk.type));
        await this.modifyMetadata(metadataSize, refinedMetadataBuf, readAsArrayBuffer)
        const res = fetch(UploadUrl, {
            method: 'PUT',
            headers: {
                ContentType: newChunk.type,
                // 'x-amz-acl': 'public-read'
            },
            body: this.chunks[0]['chunk']
        })
        this.uploaded[partNumber] = true
        this.promises.push(res);
        this.promisesPart.push(partNumber)
        return
    }

    modifyMetadata = async (metadataSize, refinedMetadataBuf, readAsArrayBuffer) => {
        const chunk = this.chunks[0]['chunk']
        const webMBuf = await readAsArrayBuffer(chunk);
        const body = webMBuf.slice(metadataSize)
        const refinedWebM = new Blob([refinedMetadataBuf, body], {type: webM.type});
        this.chunks[0] = new Chunks(refinedWebM, 0)
        return
    }

    uploadPartUtil = async (newChunk) => {
        if (!this.UploadId){
            const res = await this.startUploadPromise
            this.UploadId = res.UploadId
            console.log('The startUpload request is not executed');
        }
        const partNumber = this.currentPartNumber()
        if (partNumber === 1)
            return
        const UploadUrl = await (await this.getUploadUrl(partNumber, newChunk.type));
        console.log('The uploadURL is', UploadUrl);
        const res = fetch(UploadUrl, {
            method: 'PUT',
            headers: {
                ContentType: newChunk.type,
                // 'x-amz-acl': 'public-read'
            },
            body: newChunk
        })
        this.uploaded[partNumber] = true
        this.promises.push(res);
        this.promisesPart.push(partNumber)
        return
    }

    uploadPart = async (chunk) => {
        const newChunk = this.appendChunk(chunk)
        if (newChunk.size < MIN_SIZE){
            return
        }
        if (!this.UploadId){
            const res = await this.startUploadPromise
            this.UploadId = res.UploadId
            console.log('The startUpload request is not executed');
        }
        return this.uploadPartUtil(newChunk)
        // console.log('The uploadVideo part', res)
        // return {ETag: res.headers.get('ETag')}
    }

    completeUpload = async (metadataSize, refinedMetadataBuf, readAsArrayBuffer) => {
        if (!this.UploadId){
            const res = await this.startUploadPromise
            this.UploadId = res.UploadId
            console.log('The startUpload request is not executed');
        }
        var request = {
            FileName: this.FileName,
            UploadId: this.UploadId,
            Parts: []
        }
        var re = []
        await this.uploadFirst(metadataSize, refinedMetadataBuf, readAsArrayBuffer)
        const result = await this.uploadRemainingChunk()
        if (result != null){
            re.push(result)
        }
        const promiseResult = await Promise.all(this.promises)
        if (promiseResult.length != 0){
            re = re.concat(promiseResult)
        }
        for ( let i = 0 ; i < re.length ;i++){
            request.Parts.push({
                PartNumber: this.promisesPart[i],
                ETag: re[i].headers.get('ETag')
            })
        }

        request.Parts.sort((e1, e2) => { return e1.PartNumber - e2.PartNumber })

        const COMPLETE_UPLOAD = "upload/complete"
        console.log('In the completeUpload method', request);
        const res = await fetch( BASE_URL + COMPLETE_UPLOAD,{
            method: 'POST',
            headers: {
                // 'Content-type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(request)
        })
        const json = await res.json()
        console.log('The result of the complete Upload is', json);
        return json

    }

    // pauseUpload = () => {

    // }

    // stopUpload = () => {

    // }

    uploadRemainingChunk = () => {
        if (this.uploaded[this.currentPartNumber()] === false){
            return this.uploadPartUtil(this.chunks[this.chunks.length - 1].chunk)
        }
        return null;
    }

    nextPartNumber = () => {
        return this.chunks.length + 1
    }

    currentPartNumber = () => {
        return this.chunks.length;
    }

    appendChunk = (chunk) => {
        if (this.chunks.length === 0){
            this.chunks.push(new Chunks(chunk, this.nextPartNumber()))
            this.uploaded[this.currentPartNumber()] = false
            return chunk
        } else {
            const oldChunk = this.chunks[this.chunks.length -1]['chunk']
            var newChunk = chunk
            if (oldChunk.size < MIN_SIZE ){
                newChunk = new Blob([oldChunk, chunk], {type: oldChunk.type})
                this.chunks.pop()
            }
            this.chunks.push(new Chunks(newChunk, this.nextPartNumber()))
            this.uploaded[this.currentPartNumber()] = false
            return newChunk
        }
    }

    getUploadUrl = async (PartNumber, ContentType) => {
        const GET_URL = "upload/url"
        const res = await fetch(BASE_URL + GET_URL + "?FileName="+this.FileName+"&PartNumber="+PartNumber+"&UploadId="+this.UploadId + "&ContentType=" + ContentType)
        console.log("In get Upload URL Request" + res)
        return res.json()
    }
}
