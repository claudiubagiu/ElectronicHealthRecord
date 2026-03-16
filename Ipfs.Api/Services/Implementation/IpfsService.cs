using FluentResults;
using Ipfs.Api.Models.Domain;
using Ipfs.Api.Models.DTOs;
using Ipfs.Api.Services.Interface;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Ipfs.Api.Services.Implementation
{
    public class IpfsService : IIpfsService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiUrl;
        private readonly string _gatewayUrl;

        public IpfsService(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _apiUrl = config["Pinata:ApiUrl"]!;
            _gatewayUrl = config["Pinata:GatewayUrl"]!;

            _httpClient.DefaultRequestHeaders.Add("pinata_api_key", config["Pinata:ApiKey"]);
            _httpClient.DefaultRequestHeaders.Add("pinata_secret_api_key", config["Pinata:SecretKey"]);
        }

        public async Task<Result<string>> UploadEncryptedDataAsync(UploadEncryptedDataRequestDto request)
        {
            try
            {
                var json = JsonSerializer.Serialize(request);
                var jsonBytes = Encoding.UTF8.GetBytes(json);

                using var content = new MultipartFormDataContent();
                var fileContent = new ByteArrayContent(jsonBytes);
                fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/json");
                content.Add(fileContent, "file", "encrypted-data.json");

                var response = await _httpClient.PostAsync($"{_apiUrl}/pinFileToIPFS", content);
                response.EnsureSuccessStatusCode();

                var responseBody = await response.Content.ReadAsStringAsync();
                var pinataResponse = JsonSerializer.Deserialize<PinataUploadResponse>(responseBody,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                return Result.Ok(pinataResponse!.IpfsHash);
            }
            catch (Exception ex)
            {
                return Result.Fail<string>(new Error("IPFS upload failed.").CausedBy(ex));
            }
        }

        public async Task<Result<EncryptedDataResponseDto>> DownloadEncryptedDataAsync(string cid)
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_gatewayUrl}/{cid}");
                response.EnsureSuccessStatusCode();

                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<EncryptedDataResponseDto>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                return Result.Ok(data!);
            }
            catch (Exception ex)
            {
                return Result.Fail<EncryptedDataResponseDto>(new Error("IPFS download failed.").CausedBy(ex));
            }
        }
    }
}
