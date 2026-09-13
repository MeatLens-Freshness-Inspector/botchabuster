package com.school.botchabuster.support;

import static org.junit.Assert.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

public final class AndroidSourceAssertions {

    private AndroidSourceAssertions() {
    }

    public static String readAppFile(String relativePath) {
        Path appFile = AndroidProjectContract.appModuleDirectory()
                .resolve(relativePath)
                .normalize();
        if (!appFile.startsWith(AndroidProjectContract.appModuleDirectory())) {
            throw new AssertionError("Android contract escaped the app module: " + appFile);
        }

        try {
            return new String(Files.readAllBytes(appFile), StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new AssertionError("Unable to load Android contract file: " + appFile.toAbsolutePath(), exception);
        }
    }

    public static void assertContains(String source, String contractName, String expectedText) {
        assertTrue(contractName + " must contain: " + expectedText, source.contains(expectedText));
    }

    public static void assertNotContains(String source, String contractName, String unexpectedText) {
        assertTrue(contractName + " must not contain: " + unexpectedText, !source.contains(unexpectedText));
    }

    public static void assertXmlAttribute(
            String relativePath,
            String elementName,
            String attributeName,
            String expectedValue
    ) {
        Document document;
        try {
            document = DocumentBuilderFactory.newInstance()
                    .newDocumentBuilder()
                    .parse(AndroidProjectContract.appModuleDirectory().resolve(relativePath).toFile());
        } catch (IOException | ParserConfigurationException | SAXException exception) {
            throw new AssertionError("Unable to parse Android XML contract: " + relativePath, exception);
        }

        NodeList elements = document.getElementsByTagName(elementName);
        for (int index = 0; index < elements.getLength(); index++) {
            Element element = (Element) elements.item(index);
            if (expectedValue.equals(element.getAttribute(attributeName))) {
                return;
            }
        }

        throw new AssertionError(
                "Expected <" + elementName + "> with " + attributeName + "=\"" + expectedValue
                        + " in " + relativePath);
    }
}
