package com.school.botchabuster.support;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public final class AndroidProjectContract {

    private AndroidProjectContract() {
    }

    public static Path appModuleDirectory() {
        Path workingDirectory = Paths.get(System.getProperty("user.dir"))
                .toAbsolutePath()
                .normalize();
        Path[] candidates = {
                workingDirectory,
                workingDirectory.resolve("app"),
                workingDirectory.resolve("android").resolve("app"),
                workingDirectory.resolve("..").resolve("android").resolve("app").normalize()
        };

        for (Path candidate : candidates) {
            if (Files.isDirectory(candidate)) {
                return candidate;
            }
        }

        throw new AssertionError("Unable to locate the Android app module from " + workingDirectory);
    }
}
