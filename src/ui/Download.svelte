<script lang="ts">
  import Title from '@components/Title.svelte';
  import Button from '@components/Button.svelte';
  import PageLayout from '@components/PageLayout.svelte';
  import Content from '@components/Content.svelte';
  import Sidebar from '@components/Sidebar.svelte';
  import RadioItem, { RadioChangeEvent } from '@components/RadioItem.svelte';
  import ButtonFooter from '@components/ButtonFooter.svelte';
  import type { PluginMessage } from '@constants';
  import { MessageTypes } from '@constants';
  import { downloadList } from '@stores/downloadList';
  import { downloadStatus } from '@stores/downloadStatus';

  let selected = '';
  const startDownload = () => {
    downloadStatus.setMessage('Download started');
    parent.postMessage<PluginMessage<MessageTypes.CreateDownload>>(
      {
        pluginMessage: {
          type: MessageTypes.CreateDownload,
          data: $downloadList,
        },
      },
      '*'
    );
  };

  const change = (event: RadioChangeEvent) => {
    selected = event.detail.value;
  };

  $: files = $downloadList[selected] || {};

</script>

<PageLayout class="download-page">
  <Title>Download Overview</Title>
  <Content>
    <section class="split-view">
      <section class="folder-list">
        {#each Object.keys($downloadList) as folder}
          <RadioItem name="folder" id={folder} value={folder} on:change={change}>{folder}</RadioItem>
        {/each}
      </section>
      <section class="image-list">
        {#each Object.values(files) as file}
          <div>{file.name} (scale: {file.scale})</div>
        {/each}
      </section>
    </section>
  </Content>
  <Sidebar class="bg-image">
    <Title>Only one step left to get your present</Title>
    <ol>
      <li>If you want, you're able to check the files (At least the names and the scale)</li>
      <li>Click the download button and wait a couple of seconds</li>
    </ol>
  </Sidebar>
  <ButtonFooter>
    <Button onClick={startDownload}>Start Download</Button>
  </ButtonFooter>
</PageLayout>

<style>
  :global(.download-page .bg-image) {
    background-position: bottom 1rem center;
    background-size: 80%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 810 537' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23clip0_1228_2479)'%3E%3Cpath d='M631.816 243.298H583.15C576.998 243.298 572.011 248.285 572.011 254.437V296.536C572.011 302.688 576.998 307.675 583.15 307.675H631.816C637.968 307.675 642.955 302.688 642.955 296.536V254.437C642.955 248.285 637.968 243.298 631.816 243.298Z' fill='%23C1D8ED'/%3E%3Cpath d='M296.581 48.518H230.93C222.631 48.518 215.903 55.2458 215.903 63.545V120.337C215.903 128.636 222.631 135.364 230.93 135.364H296.581C304.88 135.364 311.608 128.636 311.608 120.337V63.545C311.608 55.2458 304.88 48.518 296.581 48.518Z' fill='%230CBC8B'/%3E%3Cpath d='M404.282 24.206C404.553 24.2004 404.823 24.2191 405.091 24.262V24.262C411.824 26.501 413.871 29.784 414.986 32.701C416.149 36.0728 416.568 39.6569 416.212 43.206C415.671 48.7947 413.505 54.1025 409.98 58.473C408.241 60.5761 406.105 62.3154 403.693 63.5912C401.281 64.867 398.641 65.6544 395.925 65.908C383.482 67.3319 370.965 68.0111 358.441 67.942C352.951 67.942 347.315 67.836 341.532 67.624C351.177 57.6303 361.562 48.3787 372.6 39.948C392.7 24.965 402.517 24.206 404.282 24.206V24.206ZM404.282 0.206014C379.647 0.206014 341.282 28.651 298.971 78.876C298.229 79.7186 297.743 80.7548 297.568 81.8637C297.393 82.9725 297.537 84.1081 297.984 85.138C298.387 86.2022 299.085 87.1297 299.996 87.8123C300.906 88.4948 301.992 88.9044 303.127 88.993C318.442 90.531 338.053 91.941 358.441 91.941C371.932 92.0093 385.416 91.2717 398.82 89.732C424.587 86.601 438.12 65.311 440.093 45.6C440.893 37.655 441.269 11 412.659 1.48601C409.954 0.61137 407.125 0.179145 404.282 0.206014V0.206014Z' fill='%230CBC8B'/%3E%3Cpath d='M124.282 24.207C126.047 24.207 135.87 24.966 155.967 39.948C167.004 48.3785 177.389 57.6301 187.034 67.624C181.255 67.8353 175.618 67.941 170.122 67.941C157.598 68.0105 145.081 67.3313 132.638 65.907C129.921 65.6532 127.282 64.8658 124.87 63.59C122.459 62.3141 120.323 60.5749 118.585 58.472C115.059 54.1002 112.892 48.7911 112.352 43.201C111.997 39.6535 112.416 36.0713 113.579 32.701C114.694 29.784 116.742 26.501 123.442 24.272C123.719 24.2208 124 24.1993 124.282 24.208V24.207ZM124.282 0.208018C121.439 0.180917 118.611 0.612803 115.906 1.48702C87.2998 11 87.6738 37.655 88.4718 45.6C90.4488 65.311 103.978 86.6 129.743 89.732C143.146 91.2724 156.63 92.0104 170.122 91.942C190.515 91.942 210.122 90.531 225.439 88.993C226.573 88.9046 227.659 88.4952 228.569 87.8128C229.479 87.1303 230.176 86.203 230.579 85.139C231.025 84.1089 231.169 82.973 230.994 81.864C230.82 80.755 230.333 79.7187 229.591 78.876C187.286 28.651 148.92 0.207019 124.282 0.207019V0.208018Z' fill='%230CBC8B'/%3E%3Cpath d='M491.392 143.373H32.1199V537.42H491.392V143.373Z' fill='%230CBC8B'/%3E%3Cpath d='M307.13 144.161H216.382V537.42H307.13V144.161Z' fill='white'/%3E%3Cg opacity='0.19'%3E%3Cpath opacity='0.19' d='M491.392 143.373H32.1199V225.267H491.392V143.373Z' fill='black'/%3E%3C/g%3E%3Cpath d='M523.297 82.782H0.213867V164.188H523.297V82.782Z' fill='%230CBC8B'/%3E%3Cpath d='M327.622 82.782H195.889V164.188H327.622V82.782Z' fill='white'/%3E%3Cpath d='M716.875 229.44C720.744 230.806 721.675 232.505 722.251 233.998C722.987 236.162 723.247 238.459 723.012 240.732C722.787 242.976 721.102 254.238 709.983 255.589C700.385 256.686 690.73 257.209 681.07 257.155C679.234 257.155 677.376 257.14 675.496 257.109C698.34 235.081 712.542 229.467 716.875 229.44V229.44ZM716.907 207.44C697.648 207.44 667.655 229.677 634.578 268.94C633.997 269.599 633.616 270.41 633.48 271.278C633.343 272.145 633.456 273.034 633.806 273.84C634.121 274.672 634.667 275.397 635.379 275.931C636.09 276.464 636.939 276.785 637.826 276.854C649.799 278.054 665.126 279.154 681.07 279.154C691.618 279.208 702.159 278.631 712.637 277.427C732.781 274.98 743.357 258.335 744.903 242.927C745.527 236.716 745.822 215.874 723.456 208.44C721.341 207.757 719.13 207.419 716.907 207.44V207.44Z' fill='%23C1D8ED'/%3E%3Cpath d='M498.042 229.44C502.374 229.467 516.577 235.08 539.422 257.11C537.542 257.14 535.683 257.155 533.846 257.156C524.186 257.21 514.531 256.687 504.933 255.589C493.815 254.238 492.133 242.976 491.904 240.727C491.671 238.455 491.931 236.16 492.666 233.998C493.237 232.505 494.174 230.806 498.042 229.44V229.44ZM498.01 207.44C495.788 207.419 493.577 207.756 491.462 208.44C469.095 215.874 469.39 236.716 470.015 242.927C471.56 258.336 482.137 274.981 502.279 277.427C512.757 278.632 523.299 279.209 533.846 279.155C549.789 279.155 565.116 278.055 577.091 276.85C577.978 276.781 578.826 276.461 579.538 275.927C580.25 275.394 580.795 274.669 581.11 273.837C581.459 273.031 581.572 272.143 581.436 271.275C581.299 270.407 580.918 269.596 580.338 268.937C547.265 229.673 517.271 207.437 498.01 207.437V207.44Z' fill='%23C1D8ED'/%3E%3Cpath d='M785.007 319.363H425.96V537.419H785.007V319.363Z' fill='%23C1D8ED'/%3E%3Cpath d='M640.955 319.979H570.011V537.419H640.955V319.979Z' fill='white'/%3E%3Cg opacity='0.19'%3E%3Cpath opacity='0.19' d='M785.007 319.363H425.96V383.386H785.007V319.363Z' fill='black'/%3E%3C/g%3E%3Cpath d='M809.95 271.995H401.017V335.636H809.95V271.995Z' fill='%23C1D8ED'/%3E%3Cpath d='M656.977 271.995H553.991V335.636H656.977V271.995Z' fill='white'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_1228_2479'%3E%3Crect width='810' height='537' fill='white'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E");
  }

  :global(.download-page .content) {
    padding-bottom: 0;
  }
  .split-view {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    height: 100%;
  }

  .image-list {
    height: 100%;
    overflow: scroll;
  }
</style>
