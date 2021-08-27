class MetaEditor {

    constructor(){
        this.decoder = new EBML.Decoder();
        this.readerEBML = new EBML.Reader();
        this.readerEBML.logging = true;
        this.tasks = Promise.resolve(void 0);
        this.segmentOffset = 0;
        this.metadataElms = [];
        this.metadataSize = 0;
        this.webM = new Blob([], {type: "video/webm"});
        this.last_duration = 0;
        this.cue_points = [];
    }

    readAsArrayBuffer = async(blob)  => {
        return new Promise((resolve, reject)=>{
        const reader = new FileReader();
            reader.readAsArrayBuffer(blob);
            reader.onloadend = ()=>{ resolve(reader.result); };
            reader.onerror = (ev)=>{ reject(ev.error); };
        });
    }

    modifyMetadata = async (chunk, metadataSize, refinedMetadataBuf) => {
        const webMBuf = await this.readAsArrayBuffer(chunk);
        // There is possibility of pre append the metadata instead of making a slice
        const body = webMBuf.slice(metadataSize)
        const refinedWebM = new Blob([refinedMetadataBuf, body], {type: webMBuf.type});
        return refinedWebM
    }

    createMetaInfo = async (chunk) => {
        console.log('In the createMetaInfo for the chunk', chunk);
        const task = async ()=>{
            const buf = await this.readAsArrayBuffer(chunk);
            const elms = this.decoder.decode(buf);
            elms.forEach((elm)=>{ this.readerEBML.read(elm); });
            console.log('In the task method for the chunk', chunk);
        };
        this.tasks = this.tasks.then(()=> task() );
        return this.tasks;
    }

    combineChunks = (chunks) => {
        return new Blob(chunks, {
            type: 'video/webm'
        });
    }

    generateSeekableVideo = async (chunks) => {
        for (let chunk of chunks){
            await this.createMetaInfo(chunk);
        }
        this.readerEBML.stop();
        const refinedMetadataBuf = EBML.tools.makeMetadataSeekable(this.readerEBML.metadatas, this.readerEBML.duration, this.readerEBML.cues);
        const zeroChunk = await this.modifyMetadata(chunks[0], this.readerEBML.metadataSize, refinedMetadataBuf)
        chunks[0] = zeroChunk;
        return this.combineChunks(chunks)
    }

    printEBMLJson = async (webmBlob) => {
        const webmBuff = await this.readAsArrayBuffer(webmBlob);
        const ebmlToJson = new EbmlToJson(webmBuff);
        const json = ebmlToJson.toString()
        console.log('The json is', json);
        return json;
    }

}