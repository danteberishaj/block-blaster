# Unity Ads uses reflection and a WebView bridge internally. These rules follow
# Unity's LevelPlay adapter guidance and are consumed by the host release build.
-keepattributes SourceFile,LineNumberTable,JavascriptInterface
-keep class android.webkit.JavascriptInterface { *; }
-keep class com.unity3d.ads.** { *; }
-keep class com.unity3d.services.** { *; }
-dontwarn com.google.ar.core.**
-dontwarn com.unity3d.services.**
-dontwarn com.ironsource.adapters.unityads.**
