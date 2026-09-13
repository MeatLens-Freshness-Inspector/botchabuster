package com.school.botchabuster.architecture;

import com.school.botchabuster.support.AndroidSourceAssertions;

import org.junit.Test;

public class LauncherManifestContractTest {

    @Test
    public void manifestExposesTheMainActivityAsTheLauncher() {
        String manifest = AndroidSourceAssertions.readAppFile("src/main/AndroidManifest.xml");

        AndroidSourceAssertions.assertXmlAttribute(
                "src/main/AndroidManifest.xml", "activity", "android:name", ".MainActivity");
        AndroidSourceAssertions.assertXmlAttribute(
                "src/main/AndroidManifest.xml", "activity", "android:exported", "true");
        AndroidSourceAssertions.assertContains(manifest, "main activity intent", "android.intent.action.MAIN");
        AndroidSourceAssertions.assertContains(manifest, "launcher intent category", "android.intent.category.LAUNCHER");
    }
}
