const express = require("express");
const fs = require("fs");
const cors = require("cors");
const { TranscoderServiceClient } = require("@google-cloud/video-transcoder");
const { Storage } = require("@google-cloud/storage");
const { response } = require("express");
const { json } = require("body-parser");

const app = express();
app.use(express.json());
app.use(cors());
process.env.GOOGLE_APPLICATION_CREDENTIALS = "./creds.json";

const project_id = JSON.parse(fs.readFileSync("./creds.json")).project_id;
const location = "us-central1";
// Instantiates a client
const transcoderServiceClient = new TranscoderServiceClient();
const port = 3000;
const storage = new Storage();
const bucket_name = "transcoding-demo";
bucket = storage.bucket(bucket_name);

app.get("/", async (req, res) => {
  res.status(200).send({ status: "success", message: "transcode api" });
});

app.post("/upload", async (req, res) => {
  console.log(req.body);
  upload_response = await bucket.upload(req.body.src);
  if (upload_response != null)
    res.status(200).send({ status: "success", result: upload_response[1] });
});

/**
 * For all transcoding the required parameters are srcVideoUri, imageUris, startTime, endTime, animationStatic, animationFade
 */

app.get("/job/status/:id", async (req, res) => {
  console.log(req.params.id);
  const request = {
    name: transcoderServiceClient.jobPath(project_id, location, req.params.id),
  };

  try {
    const [response] = await transcoderServiceClient.getJob(request);
    if (response.state == "FAILED")
      res.status(200).send({
        status: `${response.state}`,
        message: `${response.failureReason}`.replace(/(\n)(\\")/gm, ""),
      });
    else
      res.status(200).send({
        status: `${response.state}`,
        message: `${response.progress}`,
      });
  } catch (error) {
    res.status(404).send({
      status: `Not found`,
      message: `Job state not found`,
    });
    console.log(`Job state not found...`);
  }
});

app.post("/transcode/animate", async (req, res) => {
  const videoJob = {
    parent: transcoderServiceClient.locationPath(project_id, location),
    job: {
      inputUri: `gs://${req.body.video_uri}`,
      outputUri: `gs://${req.body.output_folder}/`,
      config: {
        elementaryStreams: [
          {
            key: "video-stream0",
            videoStream: {
              codec: "h264",
              heightPixels: 360,
              widthPixels: 640,
              bitrateBps: 550000,
              frameRate: 60,
            },
          },
          {
            key: "audio-stream0",
            audioStream: {
              codec: "aac",
              bitrateBps: 64000,
            },
          },
        ],
        muxStreams: [
          {
            key: `${req.body.output_file_name}`,
            container: "mp4",
            elementaryStreams: ["video-stream0", "audio-stream0"],
          },
        ],
        overlays: getJobRequestTemplateForAnimationFade(req.body.images),
      },
    },
  };
  const [video_response] = await transcoderServiceClient.createJob(videoJob);
  if (video_response)
    res.status(200).send({ status: "success", result: video_response.name });
});

app.post("/transcode/static", async (req, res) => {
  const videoJob = {
    parent: transcoderServiceClient.locationPath(project_id, location),
    job: {
      inputUri: `gs://${req.body.video_uri}`,
      outputUri: `gs://${req.body.output_folder}/`,
      config: {
        elementaryStreams: [
          {
            key: "video-stream0",
            videoStream: {
              codec: "h264",
              heightPixels: 360,
              widthPixels: 640,
              bitrateBps: 550000,
              frameRate: 60,
            },
          },
          {
            key: "audio-stream0",
            audioStream: {
              codec: "aac",
              bitrateBps: 64000,
            },
          },
        ],
        muxStreams: [
          {
            key: `${req.body.output_file_name}`,
            container: "mp4",
            elementaryStreams: ["video-stream0", "audio-stream0"],
          },
        ],
        overlays: getJobRequestTemplateForAnimationStatic(req.body.images),
      },
    },
  };
  console.log(videoJob);
  const [video_response] = await transcoderServiceClient.createJob(videoJob);
  if (video_response)
    res.status(200).send({ status: "success", result: video_response.name });
});

/**
 * 
 * {
    "images": [
        {
            "image": "imageUri1",
            "fadein": {
                "startTime": "22",
                "endTime": "33"
            },
            "fadeout": {
                "startTime": "34",
                "endTime": "40"
            }
        },
        {
            "image": "imageUri2",
            "fadein": {
                "startTime": "22",
                "endTime": "33"
            },
            "fadeout": {
                "startTime": "34",
                "endTime": "40"
            }
        }
    ]
}
 */
function getJobRequestTemplateForAnimationFade(images) {
  overlays = [];
  for (const r of images) {
    overlay = {};
    overlay["image"] = {
      uri: "",
      resolution: {
        x: 1,
        y: 1,
      },
      alpha: 1,
    };
    overlay["animations"] = [
      {
        animationFade: {
          fadeType: "FADE_IN",
          xy: {
            x: 0,
            y: 0,
          },
          startTimeOffset: {
            seconds: 4,
          },
          endTimeOffset: {
            seconds: 1,
          },
        },
      },
      {
        animationFade: {
          fadeType: "FADE_OUT",
          xy: {
            x: 0,
            y: 0,
          },
          startTimeOffset: {
            seconds: 4,
          },
          endTimeOffset: {
            seconds: 1,
          },
        },
      },
    ];
    overlay.image.uri = `gs://${r.image}`;
    overlay.animations[0].animationFade.startTimeOffset.seconds =
      r.fadein.startTime;
    overlay.animations[0].animationFade.endTimeOffset.seconds =
      r.fadein.endTime;
    overlay.animations[1].animationFade.startTimeOffset.seconds =
      r.fadeout.startTime;
    overlay.animations[1].animationFade.endTimeOffset.seconds =
      r.fadeout.endTime;
    overlays.push(overlay);
    console.log(r.fadein.startTime);
    return overlays;
  }
}
/**
 *{
    "video_uri": "td-demo-318516.appspot.com/transcoder/demo.mp4",
    "output_folder": "td-demo-318516.appspot.com/transcoder",
    "output_file_name": "demo-transcoded",
    "images": [
        {
            "image": "td-demo-318516.appspot.com/transcoder/demo-overlay-2.jpeg",
            "startTime": "3",
            "endTime": "7"
        }
    ]
}
 */
function getJobRequestTemplateForAnimationStatic(images) {
  overlays = [];
  for (const r of images) {
    overlay = {};
    overlay["image"] = {
      uri: "",
      resolution: {
        x: 1,
        y: 1,
      },
      alpha: 1,
    };
    overlay["animations"] = [
      {
        animationStatic: {
          xy: {
            x: 0,
            y: 0,
          },
          startTimeOffset: {
            seconds: 4,
          },
        },
      },
      {
        animationEnd: {
          startTimeOffset: {
            seconds: 10,
          },
        },
      },
    ];
    overlay.image.uri = `gs://${r.image}`;
    overlay.animations[0].animationStatic.startTimeOffset.seconds = r.startTime;
    overlay.animations[1].animationEnd.startTimeOffset.seconds = r.endTime;
    overlays.push(overlay);
  }
  return overlays;
}

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
