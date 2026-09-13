package com.school.botchabuster.architecture;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import com.school.botchabuster.support.AndroidSourceAssertions;

import org.junit.Test;

public class SupportContractTest {

    @Test
    public void readsMaintainedApplicationSources() {
        String source = AndroidSourceAssertions.readAppFile(
                "src/main/java/com/school/botchabuster/MainActivity.java");

        AndroidSourceAssertions.assertContains(source, "MainActivity package", "package com.school.botchabuster;");
        AndroidSourceAssertions.assertContains(source, "Capacitor bridge inheritance", "extends BridgeActivity");
        assertFalse(source.contains("com.getcapacitor.myapp"));
        assertTrue(source.endsWith(System.lineSeparator()) || source.endsWith("}"));
    }
}
