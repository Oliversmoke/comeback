package com.rickchat.core.monitoring

import com.rickchat.core.config.AppConfig
import io.opentelemetry.api.OpenTelemetry
import io.opentelemetry.api.trace.Span
import io.opentelemetry.api.trace.Tracer as OTelTracer
import io.opentelemetry.api.trace.SpanKind
import io.opentelemetry.context.Context
import io.opentelemetry.sdk.OpenTelemetrySdk
import io.opentelemetry.sdk.trace.SdkTracerProvider
import io.opentelemetry.sdk.trace.export.SimpleSpanProcessor
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter

class Tracer(private val config: AppConfig) {
    private val openTelemetry: OpenTelemetry = OpenTelemetrySdk.builder().build()
    private val tracer: OTelTracer = openTelemetry.getTracer("rickchat")

    fun startSpan(name: String, kind: SpanKind = SpanKind.INTERNAL): Span {
        return tracer.spanBuilder(name)
            .setSpanKind(kind)
            .startSpan()
    }

    fun startSpanWithParent(name: String, parent: Span, kind: SpanKind = SpanKind.INTERNAL): Span {
        return tracer.spanBuilder(name)
            .setParent(Context.current().with(parent))
            .setSpanKind(kind)
            .startSpan()
    }

    fun endSpan(span: Span) {
        span.end()
    }

    fun addEvent(span: Span, name: String, attributes: Map<String, String> = emptyMap()) {
        span.addEvent(name)
    }

    fun setAttribute(span: Span, key: String, value: String) {
        span.setAttribute(key, value)
    }

    fun recordException(span: Span, exception: Throwable) {
        span.recordException(exception)
    }
}
