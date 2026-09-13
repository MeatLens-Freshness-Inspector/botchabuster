package com.school.botchabuster.architecture;

import com.school.botchabuster.support.AndroidSourceAssertions;

import org.junit.Test;

public class MainActivityContractTest {

    @Test
    public void mainActivityIsTheCapacitorBridgeEntryPoint() {
        String source = AndroidSourceAssertions.readAppFile(
                "src/main/java/com/school/botchabuster/MainActivity.java");

        AndroidSourceAssertions.assertContains(source, "MainActivity package", "package com.school.botchabuster;");
        AndroidSourceAssertions.assertContains(source, "Capacitor bridge import", "import com.getcapacitor.BridgeActivity;");
        AndroidSourceAssertions.assertContains(source, "Capacitor bridge inheritance", "extends BridgeActivity");
    }
}
