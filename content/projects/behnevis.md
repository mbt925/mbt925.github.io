---
title: "Behnevis Java Mobile Library"
date: 2022-01-03T17:00:52+01:00
draft: false
---

![icon](/images/projects/behnevis/icon.png)

J2ME (Java Mobile) development didn't support BiDi texts and also full aligment of texts. Also Android couldn't handle BiDi texts in early days. At first, I created BehNevis for Java Mobile platform. I then extended it to support Android. I heavily utilized it until Android 4.4. BehNevis had the following features: 

* **Drawing via bitmap font**: with this, one could display a text with a certain bitmap font across multiple devices, irrespective of their internal BiDi support level. However, BehNevis had to handle all the prerequisite low-level text processing, including shaping, measurement, etc.
* **Reshaping**: When a framework/OS shape render engine doesn't support open type features (or gsub table), it simply concatenates characters together and displays them. With reshaping, BehNevis could fix this issue and replace the correct character in all positions, e.g., changing م‌ح‌س‌ن to محسن.
* **Alignment**: BehNevis supported left, right, center and full alignment of texts.
* **Rich Texts**: BehNevis supported BiDi texts plus images. One could display an arbitary combination of English text, Persian text, Arabic text and images.

---

### Screenshots

{{< image src="/images/projects/behnevis/screenshot1.png">}}
{{< image src="/images/projects/behnevis/screenshot2.png">}}
{{< image src="/images/projects/behnevis/screenshot3.png">}}
{{< image src="/images/projects/behnevis/screenshot4.png">}}
{{< image src="/images/projects/behnevis/screenshot5.png">}}