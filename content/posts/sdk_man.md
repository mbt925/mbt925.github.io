---
title: "Manage your SDKs like a pro"
date: 2024-09-08T22:40:09+02:00
draft: false
featuredImage: "/images/blog/manage_your_sdks_like_a_pro.webp"
featuredImagePreview: "/images/blog/manage_your_sdks_like_a_pro.webp"
---

For anyone setting up Java, Kotlin, or Spring SDKs manually, the process of tweaking environment variables like `HOME`
and `PATH` might feel cumbersome. Fortunately, there’s a much simpler solution: [SDKMAN!](https://sdkman.io/).

I've been happily using SDKMAN! for a while, and it has made managing SDKs a breeze. With
SDKMAN!, installing Java, changing the default Kotlin version, or updating to the latest Spring Boot version is a
one-liner.

## Installing SDKMAN!

Getting SDKMAN! up and running on a UNIX-based system is straightforward. It supports macOS, Linux, and even Windows (
via WSL). Plus, it's compatible with both Bash and ZSH shells.

To get started, open a new terminal and run the following command:
> curl -s "https://get.sdkman.io" | bash

Once the installation is complete, run the following in the same or a new terminal session:
> source "$HOME/.sdkman/bin/sdkman-init.sh"

## Managing SDKs

Now, you can install the latest stable version of your preferred SDK (say, Java) by running the following command:
> sdk install java

It will prompt you to set this version as the default, and just like that—no need to fiddle with `HOME` or `PATH`
variables.

## Listing Available Versions

Want to see all available versions of a specific SDK, like Kotlin? It’s just as easy:
> sdk list kotlin

This command will display a list of all available, local, installed, and currently in-use versions of Kotlin.

```
================================================================================
Available Kotlin Versions
================================================================================
 > * 2.0.20              1.5.21              1.3.10              1.1.4          
     2.0.10              1.5.10              1.3.0               1.1.3-2        
     2.0.0               1.5.0               1.2.71              1.1.3          
     1.9.24              1.4.31              1.2.70              1.1.2-5        
     1.9.23              1.4.30              1.2.61              1.1.2-2        
     1.9.22              1.4.21              1.2.60              1.1.2          
     1.9.21              1.4.20              1.2.51              1.1.1          
     1.9.20              1.4.10              1.2.50              1.1            
     1.9.10              1.4.0               1.2.41              1.0.7          
     1.9.0               1.3.72              1.2.40              1.0.6          
     1.8.20              1.3.71              1.2.31              1.0.5-2        
     1.8.0               1.3.70              1.2.30              1.0.5          
     1.7.21              1.3.61              1.2.21              1.0.4          
     1.7.20              1.3.60              1.2.20              1.0.3          
     1.7.10              1.3.50              1.2.10              1.0.2          
     1.7.0               1.3.41              1.2.0               1.0.1-2        
     1.6.21              1.3.40              1.1.61              1.0.1-1        
     1.6.20              1.3.31              1.1.60              1.0.1          
     1.6.10              1.3.30              1.1.51              1.0.0          
     1.6.0               1.3.21              1.1.50                             
     1.5.31              1.3.20              1.1.4-3                            
     1.5.30              1.3.11              1.1.4-2                            

================================================================================
+ - local version
* - installed
> - currently in use
================================================================================
```

## Changing the default

Need to switch to a different version? No problem. To set Kotlin 2.0.0 as the default, just run:
> sdk default kotlin 2.0.0

## Additional Features

SDKMAN! also includes a variety of useful features, such as offline mode, self-update, and the ability to set SDK
versions on a per-project basis.
It’s a handy tool that saves time and effort—give it a try and simplify your SDK management!









