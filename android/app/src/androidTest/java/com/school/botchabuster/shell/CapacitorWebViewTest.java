package com.school.botchabuster.shell;

import androidx.test.core.app.ActivityScenario;

import com.school.botchabuster.MainActivity;
import com.school.botchabuster.support.ActivityAssertions;
import com.school.botchabuster.support.ViewTreeAssertions;

import org.junit.Test;

public class CapacitorWebViewTest {

    @Test
    public void mainActivityContainsTheDisplayedCapacitorWebView() {
        ActivityScenario<MainActivity> scenario = ActivityAssertions.launchMainActivity();
        try {
            scenario.onActivity(ViewTreeAssertions::requireDisplayedWebView);
        } finally {
            scenario.close();
        }
    }
}
