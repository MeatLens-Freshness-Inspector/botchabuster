package com.school.botchabuster.support;

import static org.junit.Assert.assertEquals;

import androidx.lifecycle.Lifecycle;
import androidx.test.core.app.ActivityScenario;

import com.school.botchabuster.MainActivity;

public final class ActivityAssertions {

    private ActivityAssertions() {
    }

    public static ActivityScenario<MainActivity> launchMainActivity() {
        return ActivityScenario.launch(MainActivity.class);
    }

    public static void assertResumed(ActivityScenario<MainActivity> scenario) {
        scenario.onActivity(activity -> assertEquals(
                "MainActivity should be resumed after launch",
                Lifecycle.State.RESUMED,
                activity.getLifecycle().getCurrentState()));
    }
}
