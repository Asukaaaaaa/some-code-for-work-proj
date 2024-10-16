<template>
  <canvas ref="canvas"></canvas>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  toRefs,
  onMounted,
  onBeforeUnmount,
  computed,
  watchEffect,
} from "vue";
import { Parser, Player } from "svga";
import { Mutex } from "./mutex";

enum SvgaInstanceState {
  UNINITIALIZED = 0,
  INITIALIZED = 1,
  LOADED = 2,
  PLAYING = 3,
  PAUSED = 4,
}

export default defineComponent({
  props: {
    value: { type: String, default: "" },
    loop: { type: Number, default: 0 },
    pauseSwitch: { type: Boolean, default: false },
    playSwitch: { type: Boolean, default: false },
    loadSwitch: { type: Boolean, default: true },
  },
  setup(props, ctx) {
    const state = reactive({
      canvas: null as HTMLCanvasElement | null,
      parser: null as Parser | null,
      palyer: null as Player | null,
      currentSource: "",
      internalState: SvgaInstanceState.UNINITIALIZED,
    });

    const mutex = new Mutex();

    const actions = {
      updateState: (newState: SvgaInstanceState) => {
        state.internalState = newState;
      },
      initializePlayer: () => {
        if (!state.canvas) throw new Error("Canvas not found");
        state.parser = new Parser();
        state.palyer = new Player(state.canvas);
        state.palyer.setConfig({
          loop: props.loop,
        });
        actions.updateState(SvgaInstanceState.INITIALIZED);
      },
      load: async (source: string) => {
        const svga = await state.parser?.load(source);
        if (!svga) throw new Error(`SVGA source not found\n${source}`);
        state.palyer?.mount(svga);
        state.currentSource = source;
        actions.updateState(SvgaInstanceState.LOADED);
      },
      destroy: () => {
        state.palyer?.destroy();
        state.currentSource = "";
        actions.updateState(SvgaInstanceState.INITIALIZED);
      },
      play: () => {
        state.palyer?.start();
        actions.updateState(SvgaInstanceState.PLAYING);
      },
      stop: () => {
        state.palyer?.stop();
        actions.updateState(SvgaInstanceState.LOADED);
      },
      pause: () => {
        state.palyer?.pause();
        actions.updateState(SvgaInstanceState.PAUSED);
      },
      resume: () => {
        state.palyer?.resume();
        actions.updateState(SvgaInstanceState.PLAYING);
      },
      handleStateChange: async (newState: SvgaInstanceState) =>
        // 使用 mutex 同步处理以避免竞态
        mutex.dispatch(async () => {
          if (newState > state.internalState /* 升级 */) {
            let val = state.internalState;
            while (val++ < newState) {
              switch (val) {
                case SvgaInstanceState.LOADED:
                  await actions.load(props.value);
                  break;
                case SvgaInstanceState.PLAYING:
                  actions.play();
                  break;
                case SvgaInstanceState.PAUSED:
                  actions.pause();
                  break;
                default:
                  throw new Error(`Invalid state ${val}`);
              }
            }
          } else if (newState < state.internalState /* 降级 */) {
            switch (newState) {
              case SvgaInstanceState.INITIALIZED:
                actions.destroy();
                break;
              case SvgaInstanceState.LOADED:
                actions.stop();
                break;
              case SvgaInstanceState.PLAYING:
                actions.resume();
                break;
              default:
                throw new Error(`Invalid state ${newState}`);
            }
          }
        }),
    };

    onMounted(() => {
      actions.initializePlayer();
    });

    onBeforeUnmount(() => {
      actions.destroy();
    });

    watchEffect(() => {
      if (props.value && props.value !== state.currentSource) actions.destroy();

      let targetState: SvgaInstanceState;
      if (props.loadSwitch)
        if (props.playSwitch)
          if (props.pauseSwitch) targetState = SvgaInstanceState.PAUSED;
          else targetState = SvgaInstanceState.PLAYING;
        else targetState = SvgaInstanceState.LOADED;
      else targetState = SvgaInstanceState.INITIALIZED;

      actions.handleStateChange(targetState);
    });

    return {
      ...toRefs(state),
      ...actions,
    };
  },
});
</script>

<style lang="scss" scoped></style>
