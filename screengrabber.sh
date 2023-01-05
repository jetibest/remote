#!/bin/bash

# depends on: ffmpeg, ncat (nmap)

# important note: the javascript h264 decoder requires a 'baseline' profile, otherwise it will fail to decode any frame (although 'main' might also work sometimes)

# try out with x11grab (270ms latency):
# ffmpeg -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format vaapi -f x11grab -r 30 -video_size 1920x1080 -i :0.0 -vf 'format=nv12,hwupload' -c:v h264_vaapi -qp 24 -tune zerolatency -f mpegts pipe:1 | ffplay -f mpegts -max_delay 0 -max_probe_packets 1 -analyzeduration 0 -flags +low_delay -fflags +nobuffer -i pipe:0

# kmsgrab (230ms latency):
# sudo ffmpeg -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format vaapi -f kmsgrab -framerate 30 -i - -vf hwmap=derive_device=vaapi,scale_vaapi=w=1920:h=1080:format=nv12 -c:v h264_vaapi -qp 24 -tune zerolatency -f mpegts pipe:1 | ffplay -f mpegts -max_delay 0 -max_probe_packets 1 -analyzeduration 0 -flags +low_delay -fflags +nobuffer -i pipe:0

screen_width="1920"
screen_height="1080"

cleanup()
{
    rm -f /tmp/screengrabber.sock
}
trap cleanup EXIT

rm -f /tmp/screengrabber.sock 2>/dev/null

#ncat --unixsock --send-only --keep-open --listen --sh-exec "ffmpeg -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format vaapi -f x11grab -r 30 -video_size 1920x1080 -i :0.0 -vf 'format=nv12,hwupload' -c:v h264_vaapi -qp 24 -tune zerolatency -f mpegts pipe:1" /tmp/screengrabber.sock
#ncat --unixsock --send-only --keep-open --listen --sh-exec "ffmpeg -f x11grab -r 60 -video_size 1920x1080 -i :0.0 -vf format=yuv420p -c:v libx264 -profile baseline -crf 24 -tune zerolatency -f mpegts pipe:1" /tmp/screengrabber.sock
ncat --unixsock --send-only --keep-open --listen --sh-exec "ffmpeg -f x11grab -i :0.0 -c:v libx264 -preset:v ultrafast -crf:v 24 -profile:v baseline -tune zerolatency -pix_fmt yuv420p -f mpegts pipe:1" /tmp/screengrabber.sock
#ncat --unixsock --send-only --keep-open --listen --sh-exec "ffmpeg -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format vaapi -f kmsgrab -framerate 60 -i - -vf hwmap=derive_device=vaapi,scale_vaapi=w=1280:h=720:format=nv12,hwdownload -pix_fmt yuv420p -c:v libx264 -qp 24 -profile:v baseline -preset:v ultrafast -tune:v zerolatency -f mpegts pipe:1" /tmp/screengrabber.sock
# -crf:v 24
# -qp 24
# -b:v 2000k
# -preset:v ultrafast
# -flags:v +global_header -bsf:v dump_extra


