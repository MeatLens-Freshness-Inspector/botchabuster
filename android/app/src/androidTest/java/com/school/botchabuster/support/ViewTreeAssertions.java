package com.school.botchabuster.support;

import static org.junit.Assert.assertTrue;

import android.app.Activity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;

public final class ViewTreeAssertions {

    private ViewTreeAssertions() {
    }

    public static WebView requireDisplayedWebView(Activity activity) {
        View webView = findWebView(activity.getWindow().getDecorView());
        assertTrue("MainActivity should contain a displayed WebView", webView != null && webView.isShown());
        return (WebView) webView;
    }

    private static View findWebView(View view) {
        if (view instanceof WebView) {
            return view;
        }
        if (!(view instanceof ViewGroup)) {
            return null;
        }

        ViewGroup group = (ViewGroup) view;
        for (int index = 0; index < group.getChildCount(); index++) {
            View found = findWebView(group.getChildAt(index));
            if (found != null) {
                return found;
            }
        }
        return null;
    }
}
