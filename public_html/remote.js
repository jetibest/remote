var JSMpegCustomPlayer = (function()
{
        function concatUint8Arrays(arrays)
        {
            // Create array of the correct length
            var total = 0;
            for(var i=0;i<arrays.length;++i)
            {
                total += arrays[i].length;
            }
            var arr = new Uint8Array(total);

            // Put arrays in the newly created array
            var offset = 0;
            for(var i=0;i<arrays.length;++i)
            {
                var buf = arrays[i];
                arr.set(buf, offset);
                offset += buf.length;
            }

            return arr;
        }
        
        return function(options)
        {
            options = options || {};
            var self = this;

            // Use Broadway library to decode h264 frames and display on canvas
            self.broadwayPlayer = new Player({
                useWorker: true,
                canvas: options.canvas,
                workerFile: options.decoderFile, // important note: worker needs to be on same domain!
                contextOptions: {
                    preserveDrawingBuffer: false
                }
            });
            
            // we need to implement frame dropping, so we will never lag behind
            self.state = 0;
            self.stateEpochMS = Date.now();
            
            var lastFrameComplete = 0;
            
            self.broadwayPlayer.onPictureDecoded = function()
            {
                ++self.state;
                self.stateEpochMS = Date.now();
            };
            self.broadwayPlayer.onRenderFrameComplete = function()
            {
                self.state = 0;
                self.stateEpochMS = Date.now();
                
                // prevent becoming negative if multiple frames were decoded per buffers package
                // or due to resetting deltaFrames based on lastFrameComplete in the write-function
                if(deltaFrames > 0)
                {
                    --deltaFrames;
                }
                
                lastFrameComplete = Date.now();
            };

            self.canvas = self.broadwayPlayer.canvas;

            var deltaFrames = 0;

            self.demuxer = new JSMpeg.Demuxer.TS(options);
            self.demuxer.connect(JSMpeg.Demuxer.TS.STREAM.VIDEO_1, {
                write: function(pts, buffers)
                {
                    // writing buffers, which is always starting with: 0,0,0,1,NAL-type(e.g. 9),240,0,0,0,1,65,155,...
                    // if we can't keep up, we should skip frames here...
                    // rendering is nearly instant, demuxing is also pretty fast
                    // decoding is the real work, so we want to do it in a parallel worker process..
                    // because then we can drop frames, otherwise we won't know how fast we're going

                    // if we join an existing stream, it may take a long time (=many frames) before we actually get onPictureDecoded and onRenderFrameComplete
                    // so if we haven't decoded any frames for a while, we shouldn't drop frames, and especially not the first time
                    if(lastFrameComplete !== 0 && Date.now() - lastFrameComplete > 2000) // if more than 2s no frame decoded, we should stop dropping any frames, until we have it again
                    {
                        console.log('last frame completed >2s ago, resetting lastFrameComplete at ' + deltaFrames + ', ' + self.state + ', ' + self.stateEpochMS);
                        lastFrameComplete = 0; // which will prevent frame-drop
                    }
                    if(lastFrameComplete === 0)
                    {
                        deltaFrames = 0;
                    }
                    
                    if(!self.state && deltaFrames <= 5)
                    {
                        ++deltaFrames;
                        self.stateEpochMS = Date.now();
                        self.broadwayPlayer.decode(concatUint8Arrays(buffers));
                    }
                    // else: h264 frame is dropped
                }
            });
            self.write = function(data)
            {
                self.demuxer.write(data);
            };
        };
})();

function create_screenviewer()
{
	var canvas = document.createElement('canvas');
	canvas.width = 1920;
	canvas.height = 1080;
	canvas.style.width = canvas.width + 'px';
	canvas.style.height = canvas.height + 'px';
	canvas.style.display = 'block';
	canvas.style.objectFit = 'contain';
	document.body.appendChild(canvas);
	
	var p = new JSMpegCustomPlayer({
		decoderFile: window.location.href.replace(/[/]$/g, '') + '/h264-decoder.js',
		canvas: canvas
	});
	
	var ws = new WebSocket(window.location.href.replace('http:', 'ws:').replace('https:', 'wss:').replace(/[/]$/g, '') + '/screen.jsws');
	ws.binaryType = 'arraybuffer';
	ws.onopen = function()
	{
		console.log('ws.onopen');
	};
	ws.onmessage = function(e)
	{
		// console.log('Received: ' + arr.length + ' bytes, starting with: ', arr.slice(0, 16));
		p.write(new Uint8Array(e.data));
	};
	ws.onclose = function()
	{
		console.log('ws.onclose');
	};
	
    canvas.onclick = function()
    {
        if(document.fullscreenElement) return;
        this.requestFullscreen();
    };
}

window.onload = function()
{
	create_screenviewer();
};
