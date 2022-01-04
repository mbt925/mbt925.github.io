---
title: "Behnevis"
date: 2022-01-03T17:00:52+01:00
draft: false
---

![icon](/images/behnevis/icon.png)

J2ME (Java Mobile) development didn't support BiDi texts and also full aligment of texts. Also Android couldn't handle BiDi texts in early days. I created BehNevis as a solution to both problems. I then extend BehNevis to support Android. I heavily used it up until Android 4.4. BehNevis had the following features: 

* **Drawing via bitmap font**: with this, one could display a text with a certain bitmap font across multiple devices, irrespective of their internal BiDi support level. However, BehNevis had to handle all the prerequisite low-level text processing, including shaping, measurement, etc.
* **Reshaping**: When a framework/OS shape render engine doesn't support open type features (or gsub table), it simply concatenates characters together and displays them. With reshaping, BehNevis could fix this issue and replace the correct character in all positions, e.g., changing م‌ح‌س‌ن to محسن.
* **Alignment**: BehNevis supported left, right, center and full alignment of texts.
* **Rich Texts**: BehNevis supported BiDi texts plus images. One could display an arbitary combination of English text, Persian text, Arabic text and images.

---

### Screenshots

![screenshot1](/images/behnevis/screenshot1.png)
![screenshot2](/images/behnevis/screenshot2.png)
![screenshot3](/images/behnevis/screenshot3.png)
![screenshot4](/images/behnevis/screenshot4.png)
![screenshot5](/images/behnevis/screenshot5.png)