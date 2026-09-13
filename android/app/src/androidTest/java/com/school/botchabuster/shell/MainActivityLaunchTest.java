package com.school.botchabuster.shell;

import androidx.test.core.app.ActivityScenario;

import com.school.botchabuster.MainActivity;
import com.school.botchabuster.support.ActivityAssertions;

import org.junit.Test;

public class MainActivityLaunchTest {

    @Test
    public void mainActivityLaunchesIntoTheApplicationShell() {
        ActivityScenario<MainActivity> scenario = ActivityAssertions.launchMainActivity();
        try {
            ActivityAssertions.assertResumed(scenario);
        } finally {
            scenario.close();
        }
    }
}
