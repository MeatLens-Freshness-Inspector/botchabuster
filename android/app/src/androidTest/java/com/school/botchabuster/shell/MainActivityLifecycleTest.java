package com.school.botchabuster.shell;

import static org.junit.Assert.assertEquals;

import androidx.lifecycle.Lifecycle;
import androidx.test.core.app.ActivityScenario;

import com.school.botchabuster.MainActivity;
import com.school.botchabuster.support.ActivityAssertions;

import org.junit.Test;

public class MainActivityLifecycleTest {

    @Test
    public void mainActivityReachesResumedStateAfterLaunch() {
        ActivityScenario<MainActivity> scenario = ActivityAssertions.launchMainActivity();
        try {
            scenario.onActivity(activity -> assertEquals(
                    Lifecycle.State.RESUMED,
                    activity.getLifecycle().getCurrentState()));
        } finally {
            scenario.close();
        }
    }
}
