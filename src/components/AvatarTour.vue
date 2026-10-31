<template>
  <!-- First time the studio opens: three tips pointing at the stage, the wardrobe and Save.
       Uses the app's FeatureTour (same look as the other tours); "Skip" or "Got it" ends it for good. -->
  <FeatureTour storage-key="chuise-tour-avatar-v1" :steps="steps" :delay="600" />
</template>

<script setup>
import FeatureTour from './FeatureTour.vue'

const steps = [
  {
    target: '[data-tour=avatar-stage]',
    icon: 'sparkles',
    title: 'Meet your Travel Twin',
    body: 'Your 3D travel buddy. Drag to turn it; the camera follows whatever you change.',
    cta: 'Got it'
  },
  {
    target: '[data-tour=avatar-wardrobe]',
    icon: 'lock',
    title: 'Unlockable travel gear',
    body: 'Finish trips to unlock hiking boots, a camera, the explorer jacket and more. Tap a locked item to see how close you are.',
    cta: 'Got it'
  },
  {
    target: '[data-tour=avatar-save]',
    icon: 'check',
    title: 'Change it any time',
    body: 'Press Save and your twin becomes your profile picture in the top bar.',
    cta: 'Got it'
  }
]
</script>
