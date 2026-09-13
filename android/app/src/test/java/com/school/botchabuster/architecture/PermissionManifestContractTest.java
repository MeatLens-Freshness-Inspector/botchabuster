package com.school.botchabuster.architecture;

import com.school.botchabuster.support.AndroidSourceAssertions;

import org.junit.Test;

public class PermissionManifestContractTest {

    @Test
    public void manifestDeclaresRequiredPlatformPermissions() {
        String manifest = AndroidSourceAssertions.readAppFile("src/main/AndroidManifest.xml");

        AndroidSourceAssertions.assertContains(
                manifest, "network permission", "android.permission.INTERNET");
        AndroidSourceAssertions.assertContains(
                manifest, "biometric permission", "android.permission.USE_BIOMETRIC");
        AndroidSourceAssertions.assertNotContains(
                manifest, "generated provider authority", "com.getcapacitor.app.fileprovider");
    }
}
