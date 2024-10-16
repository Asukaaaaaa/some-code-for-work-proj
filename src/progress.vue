<template>
  <canvas :width="width" :height="height"></canvas>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, watchEffect } from "vue";
import type { PropType } from "vue";

const DEFAULT_PATH = [
  { x: 50, y: 50 },
  { x: 250, y: 50 },
  { x: 250, y: 150 },
  { x: 50, y: 150 },
  { x: 50, y: 250 },
  { x: 250, y: 250 },
];

const DEFAULT_TRACK_STYLE = {
  width: 12,
  color: "blue",
};

const DEFAULT_PROGRESS_STYLE = {
  width: 8,
  color: "yellow",
};

type PointStruct = {
  x: number;
  y: number;
};

type PathItemStruct = PointStruct & {
  mode: "line" | "arc";
  deg?: number;
};

type LineStyleStruct = {
  width: number;
  color: string;
};

function getDistance(
  point1: PointStruct,
  point2: PointStruct,
  mode: "line"
): number;
function getDistance(
  point1: PointStruct,
  point2: PointStruct,
  mode: "arc",
  deg: number
): number;
function getDistance(
  point1: PointStruct,
  point2: PointStruct,
  mode: PathItemStruct["mode"],
  deg?: number
) {
  if (mode === "line") {
    return Math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2);
  }

  if (mode === "arc") {
    return 0;
  }

  return 0;
}

export default defineComponent({
  props: {
    value: { type: Number, default: 0 },
    width: { type: Number, default: 300 },
    height: { type: Number, default: 300 },
    path: {
      type: Array as PropType<PathItemStruct[]>,
      default: () => DEFAULT_PATH,
    },
    trackStyle: {
      type: Object as PropType<LineStyleStruct>,
      default: () => DEFAULT_TRACK_STYLE,
    },
    progressStyle: {
      type: Object as PropType<LineStyleStruct>,
      default: () => DEFAULT_PROGRESS_STYLE,
    },
  },
  setup(props) {
    const state = reactive({
      canvas: null as HTMLCanvasElement | null,
      render: null as CanvasRenderingContext2D | null,
    });

    const actions = {
      // 清除画布
      clear() {
        if (!state.render) throw new Error("render is null");

        state.render.clearRect(0, 0, props.width, props.height);
      },
      // 绘制轨道
      drawTrack: (path: PathItemStruct[], style: LineStyleStruct) => {
        if (!state.render) throw new Error("render is null");

        actions.clear();
        state.render.lineWidth = style.width;
        state.render.strokeStyle = style.color;
        state.render.lineCap = "round";
        state.render.lineJoin = "round";
        state.render.beginPath();
        state.render.moveTo(path[0].x, path[0].y);

        for (let i = 1; i < path.length; i++) {
          state.render.lineTo(path[i].x, path[i].y);
        }

        state.render.stroke();
      },
      // 绘制滑块
      drawProgress: (
        path: PathItemStruct[],
        style: LineStyleStruct,
        progress: number
      ) => {
        if (!state.render) throw new Error("render is null");

        const totalLength = path.reduce((acc, v, i) => {
          if (i === 0) return acc;

          const point1 = props.path[i - 1];
          const point2 = props.path[i];
          // ? only for lineTo
          // todo arcTo version
          const length = getDistance(point1, point2, "line");

          return acc + length;
        }, 0);
        const progressLength = totalLength * (progress / 100); // 根据进度计算滑块长度

        state.render.lineWidth = style.width;
        state.render.strokeStyle = style.color;
        state.render.beginPath();
        state.render.moveTo(path[0].x, path[0].y);

        let lengthCovered = 0;

        for (let i = 1; i < path.length; i++) {
          const point1 = path[i - 1];
          const point2 = path[i];
          const segmentLength = getDistance(point1, point2, "line");

          if (lengthCovered + segmentLength > progressLength) {
            const remainingLength = progressLength - lengthCovered;
            const ratio = remainingLength / segmentLength;
            const x = point1.x + ratio * (point2.x - point1.x);
            const y = point1.y + ratio * (point2.y - point1.y);
            state.render.lineTo(x, y);
            break;
          }

          state.render.lineTo(point2.x, point2.y);
          lengthCovered += segmentLength;
        }

        state.render.stroke();
      },
    };

    watchEffect(() => {
      actions.drawTrack(props.path, props.trackStyle);
      actions.drawProgress(props.path, props.progressStyle, props.value);
    });

    return {
      ...toRefs(state),
    };
  },
});
</script>

<style lang="scss" scoped></style>
