package br.com.bearerp.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

@Getter
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiError {

    private String code;
    private String message;
    private int status;
    private Instant timestamp;
    private List<String> details;

    public ApiError(String code, String message, int status, Instant timestamp) {
        this(code, message, status, timestamp, null);
    }
}
