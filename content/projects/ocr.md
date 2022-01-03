---
title: "Ocr"
date: 2022-01-03T16:31:10+01:00
draft: false
---

![icon](/images/ocr/icon.png)

My team and I participated in an international Persian digits competition held by the [University of Birjand](https://en.wikipedia.org/wiki/University_of_Birjand) at [PRIA 2013 pattern recognition conference and image analysis conference](https://ieeexplore.ieee.org/xpl/conhome/6520975/proceeding). Our solution was based on an MLP neural network trained on a custom training set. The training set was extended from the original one which was available at the competition's website. LBP was used as the feature extractor. Due to the lightweight configuration of the system, the runtime processing speed was quite high (10 ms per image). Dispite the fact the there were no architectural contributions, the system won the 1st place with an accuracy of ~99.5%.

---

### Screenshots

| ![pria2013](/images/ocr/pria2013.webp) | 
|:--:| 
| [The First Iranian Conference on Pattern Recognition and Image Analysis (PRIA 2013)](https://ieeexplore.ieee.org/xpl/conhome/6520975/proceeding) |

| ![pars_dataset](/images/ocr/pars_dataset.webp) | 
|:--:| 
| [Pars dataset](https://ieeexplore.ieee.org/xpl/conhome/6520975/proceeding) |

| ![hoda_dataset](/images/ocr/hoda_dataset.webp) |
|:--:|
| [HODA dataset](https://www.kaggle.com/hamedetezadi/persian-numbers)