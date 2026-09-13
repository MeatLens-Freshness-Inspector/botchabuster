package com.school.botchabuster.shell;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;

import androidx.test.platform.app.InstrumentationRegistry;

import com.school.botchabuster.MainActivity;

import org.junit.Test;

public class PackageResolutionTest {

    @Test
    public void packageManagerResolvesTheSchoolLauncherActivity() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Intent launcherIntent = new Intent(Intent.ACTION_MAIN)
                .addCategory(Intent.CATEGORY_LAUNCHER)
                .setPackage(context.getPackageName());

        ResolveInfo resolved = context.getPackageManager().resolveActivity(
                launcherIntent, PackageManager.MATCH_DEFAULT_ONLY);

        assertNotNull("The application launcher must resolve", resolved);
        assertEquals("com.school.botchabuster", resolved.activityInfo.packageName);
        assertEquals(MainActivity.class.getName(), resolved.activityInfo.name);
    }
}
