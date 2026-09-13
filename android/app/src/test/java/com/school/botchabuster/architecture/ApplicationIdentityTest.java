package com.school.botchabuster.architecture;

import com.school.botchabuster.support.AndroidSourceAssertions;

import org.junit.Test;

public class ApplicationIdentityTest {

    @Test
    public void applicationIdentityUsesTheSchoolPackage() {
        String buildScript = AndroidSourceAssertions.readAppFile("build.gradle");
        String mainActivity = AndroidSourceAssertions.readAppFile(
                "src/main/java/com/school/botchabuster/MainActivity.java");

        AndroidSourceAssertions.assertContains(buildScript, "Android namespace", "namespace = \"com.school.botchabuster\"");
        AndroidSourceAssertions.assertContains(buildScript, "Android application ID", "applicationId \"com.school.botchabuster\"");
        AndroidSourceAssertions.assertContains(mainActivity, "MainActivity package", "package com.school.botchabuster;");
        AndroidSourceAssertions.assertNotContains(buildScript, "generated application package", "com.getcapacitor.app");
    }
}
