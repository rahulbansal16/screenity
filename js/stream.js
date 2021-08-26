const decoder = new EBML.Decoder();
const reader = new EBML.Reader();
reader.logging = true;

let tasks = Promise.resolve(0);
let segmentOffset = 0;
let metadataElms = [];
const cluster_ptrs =[];
let metadataSize = 0;
let webM = new Blob([], {type: "video/webm"});
let last_duration = 0;
const cue_points = [];


// const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
// const rec = new MediaRecorder(stream, { mimeType: 'video/webm; codecs="vp8, opus"'});

reader.addListener("segment_offset", (offset)=>{
  segmentOffset = offset;
});

reader.addListener("cluster_ptr", (ptr)=>{
  cluster_ptrs.push(ptr);
});

reader.addListener("metadata", ({data, metadataSize: size})=>{
    metadataElms = data;
    metadataSize = size;
  });

reader.addListener("duration", ({timecodeScale, duration})=>{
  last_duration = duration;
});

reader.addListener("cue_info", ({CueTrack, CueClusterPosition, CueTime})=>{
  cue_points.push({CueTrack, CueClusterPosition, CueTime});
})


function readAsArrayBuffer(blob) {
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.readAsArrayBuffer(blob);
      reader.onloadend = ()=>{ resolve(reader.result); };
      reader.onerror = (ev)=>{ reject(ev.error); };
    });
  }


  const createMetaInfo = (chunk) => {
    console.log('In the createMetaInfo for the chunk', chunk);
    const task = async ()=>{
        const buf = await readAsArrayBuffer(chunk);
        const elms = decoder.decode(buf);
        elms.forEach((elm)=>{
          reader.read(elm);
        });
        console.log('In the task method for the chunk', chunk);
    };
    tasks = tasks.then(()=> task() );
    return tasks;
}

const TrimVideo = async (chunks) => {
    for (let chunk in chunks){
        await createMetaInfo(chunks[chunk]);
    }
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        const refinedMetadataElms = EBML.tools.putRefinedMetaData(metadataElms,  cluster_ptrs, last_duration);
        const refinedMetadataBuf = new Encoder().encode(refinedMetadataElms);
        const zeroChunk = await modifyMetadata(chunks[0], metadataSize, refinedMetadataBuf)
        chunks[0] = zeroChunk;
        // return chunks;
        resolve(chunks);
      }, 3000)
    })
}

const modifyMetadata = async (chunk, metadataSize, refinedMetadataBuf) => {
    const webMBuf = await readAsArrayBuffer(chunk);
    // There is possibility of pre append the metadata instead of making a slice
    const body = webMBuf.slice(metadataSize)
    const refinedWebM = new Blob([refinedMetadataBuf, body], {type: webM.type});
    return refinedWebM
}
